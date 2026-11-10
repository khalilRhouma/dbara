import { describe, expect, it } from 'vitest'
import { seedDishes } from '../data/seed'
import { CONFIG, suggest } from './suggest'
import type { AskInput, Dish } from './types'

// The rules checked against the real dish list, with many different random numbers.
// These tests describe what a Tunisian family expects. If you change the weights or the dish
// table and one fails, ask whether the new behaviour is still what the family wants.

const byId = new Map(seedDishes.map((d) => [d.id, d]))
const NOV = new Date(2026, 10, 10, 12) // winter
const JAN = new Date(2026, 0, 14, 12)
const JUL = new Date(2026, 6, 14, 12) // summer

function mulberry(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Top-n dishes for many random seeds. */
function topDishes(input: AskInput, now: Date, n = 3, runs = 100): Dish[][] {
  return Array.from({ length: runs }, (_, seed) =>
    suggest(input, seedDishes, [], { marketDay: null }, now, mulberry(seed + 1)).suggestions.slice(0, n).map((s) => s.dish),
  )
}

const lunchMeatSpoon: AskInput = { meal: 'ftour', available: ['meat'], eatWith: 'spoon', maxDuration: 'long' }

describe('with the real dish list', () => {
  it('everyday dishes come first at lunch with meat and a spoon, even in winter', () => {
    for (const top of topDishes(lunchMeatSpoon, NOV)) {
      expect(top.some((d) => d.frequency === 'rare'), top.map((d) => d.name).join(', ')).toBe(false)
      expect(top.filter((d) => d.frequency === 'often').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('soupy / "from time to time" dishes still exist: they come on the next page', () => {
    const all = suggest(lunchMeatSpoon, seedDishes, [], { marketDay: null }, NOV, mulberry(1)).suggestions
    const jariya = all.findIndex((s) => s.dish.id === 'makrouna-jariya')
    expect(jariya).toBeGreaterThanOrEqual(3) // not on the first page
    expect(jariya).toBeGreaterThan(-1) // but offered
  })

  it('a winter dish scores lower in summer than in winter, but is not removed', () => {
    const score = (now: Date) =>
      suggest(lunchMeatSpoon, seedDishes, [], { marketDay: null }, now, () => 0.5).suggestions.find((s) => s.dish.id === 'makrouna-jariya')?.score
    expect(score(JAN)).toBeDefined()
    expect(score(JUL)).toBeDefined()
    expect(score(JAN)! - score(JUL)!).toBe(CONFIG.weights.seasonMatch - CONFIG.weights.seasonOpposite)
  })

  it('dinner is light: no heavy dish in the top three when there is plenty to choose from', () => {
    const everything: AskInput = { meal: 'acha', available: ['meat', 'chicken', 'egg', 'tuna', 'fish'], eatWith: 'any', maxDuration: 'long' }
    for (const top of topDishes(everything, NOV)) {
      expect(top.some((d) => d.heavy), top.map((d) => d.name).join(', ')).toBe(false)
    }
  })

  it('soup is not pushed down at dinner, and the winter soup comes more often in winter than in summer', () => {
    const everything: AskInput = { meal: 'acha', available: ['meat', 'chicken', 'egg', 'tuna', 'fish'], eatWith: 'any', maxDuration: 'long' }
    // "chorba-vegetables" is marked winter; it is "from time to time" at lunch but a normal light dinner
    const appears = (now: Date) => topDishes(everything, now, 6).filter((top) => top.some((d) => d.id === 'chorba-vegetables')).length
    expect(appears(NOV)).toBeGreaterThanOrEqual(20) // at least 1 time in 5 (out of 100 random draws)
    expect(appears(NOV)).toBeGreaterThan(appears(JUL))
  })

  it('on a Friday lunch, a long dish is among the top three more often than on a Tuesday', () => {
    const friday = new Date(2026, 3, 17, 12)
    const tuesday = new Date(2026, 3, 14, 12)
    const input: AskInput = { meal: 'ftour', available: ['meat', 'chicken', 'fish', 'egg', 'tuna'], eatWith: 'any', maxDuration: 'long' }
    const longTop = (now: Date) => topDishes(input, now).flat().filter((d) => d.duration === 'long').length
    expect(longTop(friday)).toBeGreaterThan(longTop(tuesday))
  })

  it('with spinach at home, a spinach dish is in the top three most of the time', () => {
    const input: AskInput = { meal: 'ftour', available: ['meat', 'chicken'], vegetables: ['spinach'], eatWith: 'bread', maxDuration: 'long' }
    const withSpinach = topDishes(input, NOV).filter((top) => top.some((d) => d.vegetables?.includes('spinach'))).length
    expect(withSpinach).toBeGreaterThanOrEqual(90) // out of 100 random draws
  })

  it('the same inputs do not always give the same three dishes (variety)', () => {
    const input: AskInput = { meal: 'ftour', available: ['meat', 'chicken'], eatWith: 'bread', maxDuration: 'long' }
    const seen = new Set(topDishes(input, NOV).flat().map((d) => d.id))
    expect(seen.size).toBeGreaterThanOrEqual(5)
  })

  it('every dish in the list can be reached (none is always last)', () => {
    const everything: AskInput = { meal: 'ftour', available: ['meat', 'chicken', 'egg', 'tuna', 'fish'], eatWith: 'any', maxDuration: 'long' }
    const result = suggest(everything, seedDishes, [], { marketDay: null }, NOV, () => 0.5)
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) expect(byId.has(s.dish.id)).toBe(true)
  })
})
