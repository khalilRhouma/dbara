import { describe, expect, it } from 'vitest'
import dishesJson from '../data/dishes.json'
import { toISODate } from './dates'
import { CONFIG, pageOf, suggest, type Reason } from './suggest'
import type { AskInput, Dish, HistoryEntry, Settings } from './types'

// 2026-04-14 is a Tuesday in a neutral month (no season rule applies), so each test
// isolates one rule. A plain dish scores exactly CONFIG.baseScore (10) when rng() = 0.
const NOW = new Date(2026, 3, 14, 12)
const rng0 = () => 0
const W = CONFIG.weights

const dish = (id: string, o: Partial<Dish> = {}): Dish => ({
  id,
  name: id,
  meal: 'both',
  requires: [],
  eatWith: 'spoon',
  family: id, // own family by default, so family rules never fire by accident
  duration: 'normal',
  season: 'all',
  fresh: false,
  ...o,
})

const input = (o: Partial<AskInput> = {}): AskInput => ({
  meal: 'acha',
  available: [],
  eatWith: 'any',
  maxDuration: 'long',
  ...o,
})

const noMarket: Settings = { marketDay: null }
const ago = (n: number, now = NOW) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n))
const cooked = (dishId: string, daysAgo: number): HistoryEntry => ({ date: ago(daysAgo), meal: 'acha', dishId })

function run(
  dishes: Dish[],
  o: { input?: Partial<AskInput>; history?: HistoryEntry[]; settings?: Settings; now?: Date; rng?: () => number } = {},
) {
  return suggest(input(o.input), dishes, o.history ?? [], o.settings ?? noMarket, o.now ?? NOW, o.rng ?? rng0)
}
const ids = (r: ReturnType<typeof run>) => r.suggestions.map((s) => s.dish.id)
const scoreOf = (r: ReturnType<typeof run>, id: string) => r.suggestions.find((s) => s.dish.id === id)?.score

describe('exclusion rules', () => {
  it('removes hidden dishes', () => {
    expect(ids(run([dish('a'), dish('b', { hidden: true })]))).toEqual(['a'])
  })

  it('removes dishes of the other meal, keeps "both"', () => {
    const dishes = [dish('ftour-only', { meal: 'ftour' }), dish('acha-only', { meal: 'acha' }), dish('both')]
    expect(ids(run(dishes, { input: { meal: 'acha' } })).sort()).toEqual(['acha-only', 'both'])
    expect(ids(run(dishes, { input: { meal: 'ftour' } })).sort()).toEqual(['both', 'ftour-only'])
  })

  it('removes dishes whose protein group has nothing available', () => {
    const dishes = [dish('meat', { requires: [['meat']] }), dish('none')]
    expect(ids(run(dishes, { input: { available: ['chicken'] } }))).toEqual(['none'])
    expect(ids(run(dishes, { input: { available: ['meat'] } })).sort()).toEqual(['meat', 'none'])
  })

  it('treats a group as OR: one available protein is enough', () => {
    const d = dish('meat-or-chicken', { requires: [['meat', 'chicken']] })
    expect(ids(run([d], { input: { available: ['chicken'] } }))).toEqual(['meat-or-chicken'])
  })

  it('treats groups as AND: every group needs something available', () => {
    const d = dish('egg-with-meat-or-chicken', { requires: [['egg'], ['meat', 'chicken']] })
    expect(ids(run([d], { input: { available: ['egg'] } }))).toEqual([])
    expect(ids(run([d], { input: { available: ['meat'] } }))).toEqual([])
    expect(ids(run([d], { input: { available: ['egg', 'chicken'] } }))).toEqual(['egg-with-meat-or-chicken'])
  })

  it('removes dishes that do not match eat-with, unless the choice is "any"', () => {
    // 3 matching dishes each time, so the "fewer than 3 → relax" rule does not interfere
    const dishes = [dish('s1'), dish('s2'), dish('s3'), dish('b1', { eatWith: 'bread' }), dish('b2', { eatWith: 'bread' }), dish('b3', { eatWith: 'bread' })]
    expect(ids(run(dishes, { input: { eatWith: 'bread' } })).sort()).toEqual(['b1', 'b2', 'b3'])
    expect(ids(run(dishes, { input: { eatWith: 'spoon' } })).sort()).toEqual(['s1', 's2', 's3'])
    expect(ids(run(dishes, { input: { eatWith: 'any' } }))).toHaveLength(6)
  })

  it('removes dishes longer than the max duration', () => {
    const mk = (p: string, duration: Dish['duration']) => [1, 2, 3].map((n) => dish(`${p}${n}`, { duration }))
    const dishes = [...mk('q', 'quick'), ...mk('n', 'normal'), ...mk('l', 'long')]
    expect(ids(run(dishes, { input: { maxDuration: 'quick' } })).sort()).toEqual(['q1', 'q2', 'q3'])
    expect(ids(run(dishes, { input: { maxDuration: 'normal' } }))).toHaveLength(6)
    expect(ids(run(dishes, { input: { maxDuration: 'long' } }))).toHaveLength(9)
  })

  it('removes dishes cooked in the last 3 days (today included) but not 4 days ago', () => {
    for (const n of [0, 1, 2, 3]) {
      expect(ids(run([dish('a')], { history: [cooked('a', n)] })), `${n} days ago`).toEqual([])
    }
    expect(ids(run([dish('a')], { history: [cooked('a', 4)] }))).toEqual(['a'])
  })

  it('ignores history dated in the future and history of unknown dishes', () => {
    const r = run([dish('a')], { history: [cooked('a', -2), cooked('deleted-dish', 1)] })
    expect(ids(r)).toEqual(['a'])
    expect(scoreOf(r, 'a')).toBe(CONFIG.baseScore)
  })
})

describe('weights', () => {
  it('starts at 10 for a plain dish', () => {
    expect(scoreOf(run([dish('a')]), 'a')).toBe(10)
  })

  it('cooked 4 to 7 days ago: -6', () => {
    for (const n of [4, 7]) expect(scoreOf(run([dish('a')], { history: [cooked('a', n)] }), 'a'), `${n}`).toBe(10 + W.cooked4to7DaysAgo)
  })

  it('cooked 8 to 14 days ago: -2', () => {
    for (const n of [8, 14]) expect(scoreOf(run([dish('a')], { history: [cooked('a', n)] }), 'a'), `${n}`).toBe(10 + W.cooked8to14DaysAgo)
  })

  it('cooked 15 or more days ago: no penalty', () => {
    expect(scoreOf(run([dish('a')], { history: [cooked('a', 15)] }), 'a')).toBe(10)
  })

  it('same family as today or yesterday: -5', () => {
    const dishes = [dish('a', { family: 'f' }), dish('b', { family: 'f' })]
    for (const n of [0, 1]) expect(scoreOf(run(dishes, { history: [cooked('a', n)] }), 'b'), `${n}`).toBe(10 + W.familyTodayOrYesterday)
  })

  it('same family two days ago: -2', () => {
    const dishes = [dish('a', { family: 'f' }), dish('b', { family: 'f' })]
    expect(scoreOf(run(dishes, { history: [cooked('a', 2)] }), 'b')).toBe(10 + W.familyTwoDaysAgo)
  })

  it('same family three or more days ago: no family penalty', () => {
    const dishes = [dish('a', { family: 'f' }), dish('b', { family: 'f' })]
    expect(scoreOf(run(dishes, { history: [cooked('a', 3)] }), 'b')).toBe(10)
  })

  it('uses the most recent cooking of the family', () => {
    const dishes = [dish('a', { family: 'f' }), dish('b', { family: 'f' }), dish('c', { family: 'f' })]
    const r = run(dishes, { history: [cooked('a', 2), cooked('b', 0)] })
    expect(scoreOf(r, 'c')).toBe(10 + W.familyTodayOrYesterday)
  })

  it('favorite: +3', () => {
    expect(scoreOf(run([dish('a', { favorite: true })]), 'a')).toBe(10 + W.favorite)
  })

  it('uses an available protein: +1 (and nothing for dishes with no protein)', () => {
    const dishes = [dish('meat', { requires: [['meat']] }), dish('none')]
    const r = run(dishes, { input: { available: ['meat'] } })
    expect(scoreOf(r, 'meat')).toBe(10 + W.usesAvailableProtein)
    expect(scoreOf(r, 'none')).toBe(10)
  })

  it('season: +2 for the current season, -4 for the opposite, 0 for "all"', () => {
    const dishes = [dish('w', { season: 'winter' }), dish('s', { season: 'summer' }), dish('all')]
    const winter = run(dishes, { now: new Date(2026, 0, 14, 12) })
    expect(scoreOf(winter, 'w')).toBe(10 + W.seasonMatch)
    expect(scoreOf(winter, 's')).toBe(10 + W.seasonOpposite)
    expect(scoreOf(winter, 'all')).toBe(10)
    const summer = run(dishes, { now: new Date(2026, 6, 14, 12) })
    expect(scoreOf(summer, 's')).toBe(10 + W.seasonMatch)
    expect(scoreOf(summer, 'w')).toBe(10 + W.seasonOpposite)
  })

  it('season: no effect in neutral months', () => {
    const r = run([dish('w', { season: 'winter' }), dish('s', { season: 'summer' })]) // April
    expect(scoreOf(r, 'w')).toBe(10)
    expect(scoreOf(r, 's')).toBe(10)
  })

  // NOW is a Tuesday (getDay() = 2)
  it('fresh dish on market day or the day after: +3', () => {
    const d = [dish('fresh', { fresh: true })]
    expect(scoreOf(run(d, { settings: { marketDay: 2 } }), 'fresh')).toBe(10 + W.freshNearMarket) // today
    expect(scoreOf(run(d, { settings: { marketDay: 1 } }), 'fresh')).toBe(10 + W.freshNearMarket) // yesterday
  })

  it('fresh dish 2 or 3 days after market day: no change', () => {
    const d = [dish('fresh', { fresh: true })]
    expect(scoreOf(run(d, { settings: { marketDay: 0 } }), 'fresh')).toBe(10) // 2 days
    expect(scoreOf(run(d, { settings: { marketDay: 6 } }), 'fresh')).toBe(10) // 3 days
  })

  it('fresh dish 4 or more days after market day: -3', () => {
    const d = [dish('fresh', { fresh: true })]
    expect(scoreOf(run(d, { settings: { marketDay: 5 } }), 'fresh')).toBe(10 + W.freshFarFromMarket) // 4 days
    expect(scoreOf(run(d, { settings: { marketDay: 3 } }), 'fresh')).toBe(10 + W.freshFarFromMarket) // 6 days
  })

  it('fresh rules are skipped when no market day is set, and for non-fresh dishes', () => {
    expect(scoreOf(run([dish('fresh', { fresh: true })], { settings: { marketDay: null } }), 'fresh')).toBe(10)
    expect(scoreOf(run([dish('plain')], { settings: { marketDay: 2 } }), 'plain')).toBe(10)
  })

  it('random bonus is rng() * 2, so between 0 and 2', () => {
    expect(scoreOf(run([dish('a')], { rng: () => 0.5 }), 'a')).toBe(10 + 0.5 * W.randomMax)
    expect(scoreOf(run([dish('a')], { rng: () => 0.999999 }), 'a')).toBeLessThan(10 + W.randomMax)
  })

  it('adds up several rules', () => {
    const d = dish('a', { favorite: true, requires: [['meat']], fresh: true })
    const r = run([d], { input: { available: ['meat'] }, settings: { marketDay: 2 }, history: [cooked('a', 6)] })
    expect(scoreOf(r, 'a')).toBe(10 + W.favorite + W.usesAvailableProtein + W.freshNearMarket + W.cooked4to7DaysAgo)
  })
})

describe('ordering', () => {
  it('sorts best score first', () => {
    const dishes = [dish('low', { season: 'winter' }), dish('mid'), dish('high', { favorite: true })]
    const r = run(dishes, { now: new Date(2026, 6, 14, 12) }) // July: winter dish is -4
    expect(ids(r)).toEqual(['high', 'mid', 'low'])
  })

  it('breaks ties by id, whatever the input order', () => {
    expect(ids(run([dish('c'), dish('a'), dish('b')]))).toEqual(['a', 'b', 'c'])
  })

  it('lets the random part reorder otherwise equal dishes', () => {
    const rngByCall = [0, 1 - 1e-9, 0] // a=+0, b=+~2, c=+0
    let i = 0
    const r = run([dish('a'), dish('b'), dish('c')], { rng: () => rngByCall[i++ % 3] })
    expect(ids(r)).toEqual(['b', 'a', 'c'])
  })
})

describe('relaxing constraints when fewer than 3 dishes match', () => {
  const spoon = (n: string, o: Partial<Dish> = {}) => dish(n, { eatWith: 'spoon', ...o })
  const bread = (n: string, o: Partial<Dish> = {}) => dish(n, { eatWith: 'bread', ...o })

  it('does not relax when there are enough results', () => {
    const r = run([bread('b1'), bread('b2'), bread('b3'), spoon('s1')], { input: { eatWith: 'bread' } })
    expect(r.relaxed).toEqual([])
    expect(ids(r)).toEqual(['b1', 'b2', 'b3'])
  })

  it('drops eat-with first', () => {
    const r = run([bread('b1'), spoon('s1'), spoon('s2')], { input: { eatWith: 'bread' } })
    expect(r.relaxed).toEqual(['eatWith'])
    expect(ids(r).sort()).toEqual(['b1', 's1', 's2'])
  })

  it('drops duration second, only if still fewer than 3', () => {
    const dishes = [spoon('q1', { duration: 'quick' }), spoon('n1'), spoon('n2')]
    const r = run(dishes, { input: { eatWith: 'any', maxDuration: 'quick' } })
    expect(r.relaxed).toEqual(['duration'])
    expect(ids(r).sort()).toEqual(['n1', 'n2', 'q1'])
  })

  it('drops both, in order, when needed', () => {
    const dishes = [bread('b-quick', { duration: 'quick' }), spoon('s-long', { duration: 'long' }), spoon('s-normal')]
    const r = run(dishes, { input: { eatWith: 'bread', maxDuration: 'quick' } })
    expect(r.relaxed).toEqual(['eatWith', 'duration'])
    expect(ids(r).sort()).toEqual(['b-quick', 's-long', 's-normal'])
  })

  it('stops after eat-with if that is enough, and keeps the duration limit', () => {
    const dishes = [spoon('q1', { duration: 'quick' }), spoon('q2', { duration: 'quick' }), bread('b-quick', { duration: 'quick' }), spoon('s-long', { duration: 'long' })]
    const r = run(dishes, { input: { eatWith: 'bread', maxDuration: 'quick' } })
    expect(r.relaxed).toEqual(['eatWith'])
    expect(ids(r).sort()).toEqual(['b-quick', 'q1', 'q2'])
  })

  it('never relaxes a constraint the user did not set', () => {
    const r = run([spoon('s1')], { input: { eatWith: 'any', maxDuration: 'long' } })
    expect(r.relaxed).toEqual([])
  })

  it('never relaxes protein, meal, hidden or recently-cooked rules', () => {
    const dishes = [dish('meat', { requires: [['meat']] }), dish('hidden', { hidden: true }), dish('recent'), dish('ftour-only', { meal: 'ftour' })]
    const r = run(dishes, { input: { eatWith: 'bread', maxDuration: 'quick' }, history: [cooked('recent', 1)] })
    expect(r.suggestions).toEqual([])
    expect(r.relaxed).toEqual(['eatWith', 'duration'])
  })

  it('returns an empty list (not an error) when nothing matches', () => {
    expect(run([])).toEqual({ suggestions: [], relaxed: [] })
  })
})

describe('reason', () => {
  const reasonOf = (r: ReturnType<typeof run>, id: string): Reason | null | undefined => r.suggestions.find((s) => s.dish.id === id)?.reason

  it('has no reason for a plain dish while the history is empty', () => {
    expect(reasonOf(run([dish('a')]), 'a')).toBeNull()
  })

  it('says how long ago it was cooked, from 8 days', () => {
    expect(reasonOf(run([dish('a')], { history: [cooked('a', 9)] }), 'a')).toEqual({ kind: 'notCookedFor', days: 9 })
    expect(reasonOf(run([dish('a')], { history: [cooked('a', 5)] }), 'a')).toBeNull()
  })

  it('says "never cooked" only when there is some history', () => {
    const r = run([dish('a'), dish('b')], { history: [cooked('b', 20)] })
    expect(reasonOf(r, 'a')).toEqual({ kind: 'neverCooked' })
  })

  it('says fresh from the market, favorite, or season when nothing about history applies', () => {
    expect(reasonOf(run([dish('a', { fresh: true })], { settings: { marketDay: 2 } }), 'a')).toEqual({ kind: 'freshMarket' })
    expect(reasonOf(run([dish('a', { favorite: true })]), 'a')).toEqual({ kind: 'favorite' })
    const winter = run([dish('a', { season: 'winter' })], { now: new Date(2026, 0, 14, 12) })
    expect(reasonOf(winter, 'a')).toEqual({ kind: 'season', season: 'winter' })
  })

  it('prefers the history reason over the others', () => {
    const r = run([dish('a', { favorite: true })], { history: [cooked('a', 10)] })
    expect(reasonOf(r, 'a')).toEqual({ kind: 'notCookedFor', days: 10 })
  })
})

describe('pageOf', () => {
  const items = [1, 2, 3, 4, 5, 6, 7]
  it('returns 3 at a time', () => {
    expect(pageOf(items, 0)).toEqual([1, 2, 3])
    expect(pageOf(items, 1)).toEqual([4, 5, 6])
    expect(pageOf(items, 2)).toEqual([7])
  })
  it('goes back to the first page after the last', () => {
    expect(pageOf(items, 3)).toEqual([1, 2, 3])
  })
  it('handles empty lists', () => {
    expect(pageOf([], 0)).toEqual([])
  })
})

describe('with the real dish list', () => {
  const real = dishesJson as Dish[]

  it('gives a full page of suggestions for a normal evening', () => {
    const r = run(real, { input: { meal: 'acha', available: ['chicken', 'egg'] }, settings: { marketDay: 2 } })
    expect(r.suggestions.length).toBeGreaterThanOrEqual(CONFIG.minResults)
    expect(r.relaxed).toEqual([])
  })

  it('is deterministic for the same inputs and rng', () => {
    const a = run(real, { input: { available: ['meat'] }, rng: () => 0.3 })
    const b = run(real, { input: { available: ['meat'] }, rng: () => 0.3 })
    expect(ids(a)).toEqual(ids(b))
  })
})
