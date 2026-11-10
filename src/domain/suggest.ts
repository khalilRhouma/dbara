import { daysBetween, daysSinceMarketDay, seasonOf, toISODate } from './dates'
import type { AskInput, Dish, Duration, HistoryEntry, Settings } from './types'

// All tunable numbers live here. The plan says the weights are estimates
// and will be adjusted after two weeks of real use.
export const CONFIG = {
  /** A dish cooked within this many days (0 = today) is removed. */
  blockDays: 3,
  baseScore: 10,
  /** Fewer results than this → relax constraints. Also the page size shown to the user. */
  minResults: 3,
  weights: {
    cooked4to7DaysAgo: -6,
    cooked8to14DaysAgo: -2,
    familyTodayOrYesterday: -5,
    familyTwoDaysAgo: -2,
    favorite: +3,
    usesAvailableProtein: +1,
    seasonMatch: +2,
    seasonOpposite: -4,
    freshNearMarket: +3, // market day or the day after
    freshFarFromMarket: -3, // 4+ days since market day
    randomMax: 2, // random bonus in [0, randomMax)
  },
} as const

const DURATION_RANK: Record<Duration, number> = { quick: 0, normal: 1, long: 2 }

export interface Suggestion {
  dish: Dish
  score: number
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

    score += rng() * w.randomMax
    results.push({ dish, score })
  }

  // Ties are broken by id so the order never depends on input order.
  return results.sort((a, b) => b.score - a.score || a.dish.id.localeCompare(b.dish.id))
}
