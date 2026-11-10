import { daysBetween, daysSinceMarketDay, seasonOf, toISODate } from './dates'
import type { AskInput, Dish, Duration, HistoryEntry, Protein, Settings, Vegetable, Weekday } from './types'

// All tunable numbers live here. The plan says the weights are estimates
// and will be adjusted after two weeks of real use.
export const CONFIG = {
  /** A dish cooked within this many days (0 = today) is removed. */
  blockDays: 3, // the family waits about 3 to 4 days before cooking the same dish again
  /** Dishes cooked within this many days count for the "same protein" rule (0 = today, 1 = yesterday). */
  proteinRecentDays: 1,
  /** Days that count as the weekend, like Date.getDay(): Friday, Saturday, Sunday. */
  weekendDays: [5, 6, 0] as readonly number[],
  baseScore: 10,
  /** Fewer results than this → relax constraints. Also the page size shown to the user. */
  minResults: 3,
  weights: {
    // After the 3 blocked days the dish may come back; it only loses a few points for a while.
    cooked4to7DaysAgo: -3,
    cooked8to14DaysAgo: -1,
    familyTodayOrYesterday: -5,
    familyTwoDaysAgo: -2,
    favorite: +3,
    usesAvailableProtein: +1,
    // Optional question: the family says which vegetables are at home. A bonus, never a filter.
    usesAvailableVegetable: +4,
    // Season is a priority, not a rule: any dish can be cooked in any season.
    seasonMatch: +2,
    seasonOpposite: -5,
    // How common the dish is at home, for lunch only: everyday dishes come first and
    // "from time to time" dishes (jariya pasta, soups...) come after, even in their own season.
    // At dinner these two rules do not apply: soup, eggs and tuna are all normal light dinners.
    often: +3,
    rare: -3,
    // Dinner at home is usually light.
    heavyAtDinner: -4,
    // Weekend (see weekendDays): longer and richer dishes at lunch, fewer quick ones.
    weekendLong: +2,
    weekendHeavyAtLunch: +2,
    weekendQuick: -1,
    favoriteDay: +4, // the dish is liked on today's weekday (e.g. couscous on Friday)
    sameProteinAsRecent: -2, // same main protein as today's or yesterday's dish
    freshNearMarket: +3, // market day or the day after
    freshFarFromMarket: -3, // 4+ days since market day
    randomMax: 4, // random bonus in [0, randomMax)
  },
} as const

/** Proteins a dish always needs: the groups with a single choice. ("meat or chicken" is not definite.) */
function definiteProteins(d: Dish): Protein[] {
  return d.requires.filter((g) => g.length === 1).map((g) => g[0])
}

const DURATION_RANK: Record<Duration, number> = { quick: 0, normal: 1, long: 2 }

/** Why a dish is shown. The UI turns this into a short Arabic sentence. */
export type Reason =
  | { kind: 'vegetable'; vegetable: Vegetable }
  | { kind: 'weekday'; day: Weekday }
  | { kind: 'notCookedFor'; days: number }
  | { kind: 'neverCooked' }
  | { kind: 'freshMarket' }
  | { kind: 'favorite' }
  | { kind: 'season'; season: 'winter' | 'summer' }

export interface Suggestion {
  dish: Dish
  score: number
  reason: Reason | null
}

/** Constraints that were dropped because too few dishes matched. */
export type Relaxed = 'eatWith' | 'duration'

export interface SuggestResult {
  /** Ranked best first. The UI shows 3 at a time ("غيرها" shows the next 3). */
  suggestions: Suggestion[]
  /** In the order they were dropped. Empty if nothing was relaxed. */
  relaxed: Relaxed[]
}

/**
 * Pure function: same inputs → same output. `now` and `rng` are parameters so tests are stable.
 * `rng` must return a number in [0, 1), like Math.random.
 */
export function suggest(
  input: AskInput,
  dishes: Dish[],
  history: HistoryEntry[],
  settings: Settings,
  now: Date,
  rng: () => number,
): SuggestResult {
  const attempt = (inp: AskInput) => rank(inp, dishes, history, settings, now, rng)

  let current = input
  let suggestions = attempt(current)
  const relaxed: Relaxed[] = []

  // Plan: drop the eat-with constraint first, then the duration constraint.
  if (suggestions.length < CONFIG.minResults && current.eatWith !== 'any') {
    current = { ...current, eatWith: 'any' }
    relaxed.push('eatWith')
    suggestions = attempt(current)
  }
  if (suggestions.length < CONFIG.minResults && current.maxDuration !== 'long') {
    current = { ...current, maxDuration: 'long' }
    relaxed.push('duration')
    suggestions = attempt(current)
  }

  return { suggestions, relaxed }
}

function rank(
  input: AskInput,
  dishes: Dish[],
  history: HistoryEntry[],
  settings: Settings,
  now: Date,
  rng: () => number,
): Suggestion[] {
  const today = toISODate(now)
  const season = seasonOf(now)
  const byId = new Map(dishes.map((d) => [d.id, d]))

  // Smallest "days ago" per dish and per family. Entries dated in the future are ignored.
  const dishAgo = new Map<string, number>()
  const familyAgo = new Map<string, number>()
  for (const e of history) {
    const ago = daysBetween(e.date, today)
    if (ago < 0) continue
    dishAgo.set(e.dishId, Math.min(ago, dishAgo.get(e.dishId) ?? Infinity))
    const family = byId.get(e.dishId)?.family
    if (family !== undefined) familyAgo.set(family, Math.min(ago, familyAgo.get(family) ?? Infinity))
  }

  // Definite proteins of the dishes cooked today or yesterday.
  const recentProteins = new Set<Protein>()
  for (const [id, ago] of dishAgo) {
    const d = byId.get(id)
    if (d && ago <= CONFIG.proteinRecentDays) for (const p of definiteProteins(d)) recentProteins.add(p)
  }
  const weekday = now.getDay() as Weekday
  const isWeekend = CONFIG.weekendDays.includes(weekday)
  const wantedVegetables = new Set<Vegetable>(input.vegetables ?? [])

  const marketDaysSince = settings.marketDay === null ? null : daysSinceMarketDay(now, settings.marketDay)
  const w = CONFIG.weights
  const results: Suggestion[] = []

  for (const dish of dishes) {
    // ---- Exclusion ----
    if (dish.hidden) continue
    if (dish.meal !== 'both' && dish.meal !== input.meal) continue
    if (!dish.requires.every((group) => group.some((p) => input.available.includes(p)))) continue
    if (input.eatWith !== 'any' && dish.eatWith !== input.eatWith) continue
    if (DURATION_RANK[dish.duration] > DURATION_RANK[input.maxDuration]) continue
    const ago = dishAgo.get(dish.id)
    if (ago !== undefined && ago <= CONFIG.blockDays) continue

    // ---- Weights ----
    let score = CONFIG.baseScore

    if (ago !== undefined) {
      if (ago <= 7) score += w.cooked4to7DaysAgo
      else if (ago <= 14) score += w.cooked8to14DaysAgo
    }

    const famAgo = familyAgo.get(dish.family)
    if (famAgo !== undefined) {
      if (famAgo <= 1) score += w.familyTodayOrYesterday
      else if (famAgo === 2) score += w.familyTwoDaysAgo
    }

    if (dish.favorite) score += w.favorite
    if (dish.requires.flat().some((p) => input.available.includes(p))) score += w.usesAvailableProtein

    if (season !== 'neutral' && dish.season !== 'all') {
      score += dish.season === season ? w.seasonMatch : w.seasonOpposite
    }

    if (dish.fresh && marketDaysSince !== null) {
      if (marketDaysSince <= 1) score += w.freshNearMarket
      else if (marketDaysSince >= 4) score += w.freshFarFromMarket
    }

    // How common a dish is only matters at lunch. At dinner everything light is on the same level.
    if (input.meal === 'ftour') {
      if (dish.frequency === 'often') score += w.often
      else if (dish.frequency === 'rare') score += w.rare
    }
    if (dish.heavy && input.meal === 'acha') score += w.heavyAtDinner
    if (isWeekend) {
      if (dish.duration === 'long') score += w.weekendLong
      else if (dish.duration === 'quick') score += w.weekendQuick
      if (dish.heavy && input.meal === 'ftour') score += w.weekendHeavyAtLunch
    }
    const matchedVegetable = dish.vegetables?.find((v) => wantedVegetables.has(v))
    if (matchedVegetable) score += w.usesAvailableVegetable
    if (dish.days?.includes(weekday)) score += w.favoriteDay
    if (definiteProteins(dish).some((p) => recentProteins.has(p))) score += w.sameProteinAsRecent

    score += rng() * w.randomMax

    // One short reason, most useful first. "Never cooked" is skipped while the history is empty.
    let reason: Reason | null = null
    if (matchedVegetable) reason = { kind: 'vegetable', vegetable: matchedVegetable }
    else if (dish.days?.includes(weekday)) reason = { kind: 'weekday', day: weekday }
    else if (ago !== undefined && ago >= 8) reason = { kind: 'notCookedFor', days: ago }
    else if (ago === undefined && history.length > 0) reason = { kind: 'neverCooked' }
    else if (dish.fresh && marketDaysSince !== null && marketDaysSince <= 1) reason = { kind: 'freshMarket' }
    else if (dish.favorite) reason = { kind: 'favorite' }
    else if (season !== 'neutral' && dish.season === season) reason = { kind: 'season', season }

    results.push({ dish, score, reason })
  }

  // Ties are broken by id so the order never depends on input order.
  return results.sort((a, b) => b.score - a.score || a.dish.id.localeCompare(b.dish.id))
}

/** Page `page` (0, 1, 2...) of `items`, `size` at a time. Goes back to the first page after the last. */
export function pageOf<T>(items: T[], page: number, size: number = CONFIG.minResults): T[] {
  if (items.length === 0) return []
  const pages = Math.ceil(items.length / size)
  const start = (((page % pages) + pages) % pages) * size
  return items.slice(start, start + size)
}
