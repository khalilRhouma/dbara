import { describe, expect, it } from 'vitest'
import { seedDishes } from './data/seed'
import { toISODate } from './domain/dates'
import { suggest } from './domain/suggest'
import type { AskInput } from './domain/types'
import { createStore, type StorageLike } from './storage/store'

// The daily flow without the screens: ask → suggest → pick → record → ask again later.

const memory = (): StorageLike => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}

const input: AskInput = { meal: 'ftour', available: ['meat', 'chicken'], eatWith: 'any', maxDuration: 'long' }
const day = (offset: number) => new Date(2026, 3, 14 + offset, 12) // 14 April 2026 is a neutral month
const ask = (store: ReturnType<typeof createStore>, now: Date) =>
  suggest(input, store.getDishes(), store.getHistory(), store.getSettings(), now, () => 0.5)

describe('daily flow', () => {
  it('a recorded dish is not suggested the next day, and comes back after 4 days', () => {
    const store = createStore(memory(), seedDishes)
    const first = ask(store, day(0)).suggestions[0].dish
    store.addHistory({ date: toISODate(day(0)), meal: 'ftour', dishId: first.id })

    for (const offset of [1, 2, 3]) {
      expect(ask(store, day(offset)).suggestions.map((s) => s.dish.id), `day +${offset}`).not.toContain(first.id)
    }
    expect(ask(store, day(4)).suggestions.map((s) => s.dish.id)).toContain(first.id)
  })

  it('the same family is pushed down the next day', () => {
    const store = createStore(memory(), seedDishes)
    const first = ask(store, day(0)).suggestions[0].dish
    const baseline = ask(store, day(1)).suggestions.find((s) => s.dish.family === first.family && s.dish.id !== first.id)
    store.addHistory({ date: toISODate(day(0)), meal: 'ftour', dishId: first.id })
    const after = ask(store, day(1)).suggestions.find((s) => s.dish.id === baseline?.dish.id)
    expect(baseline).toBeDefined()
    expect(after!.score).toBeLessThan(baseline!.score)
  })

  it('a hidden dish never comes back, and a new custom dish can be suggested', () => {
    const store = createStore(memory(), seedDishes)
    const first = ask(store, day(0)).suggestions[0].dish
    store.removeDish(first.id)
    expect(ask(store, day(0)).suggestions.map((s) => s.dish.id)).not.toContain(first.id)

    const mine = store.addDish({
      name: 'طبخة الدار', meal: 'both', requires: [['meat']], eatWith: 'spoon',
      family: 'أخرى', duration: 'quick', season: 'all', fresh: false, favorite: true,
    })
    expect(ask(store, day(0)).suggestions.map((s) => s.dish.id)).toContain(mine.id)
  })
})
