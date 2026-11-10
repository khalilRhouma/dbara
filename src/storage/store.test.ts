import { beforeEach, describe, expect, it } from 'vitest'
import dishesJson from '../data/dishes.json'
import type { Dish } from '../domain/types'
import { KEYS, createStore, mergeDishes, type StorageLike } from './store'

const seed = dishesJson as Dish[]
const FIRST = seed[0] // couscous-allouch

class MemoryStorage implements StorageLike {
  data = new Map<string, string>()
  getItem(k: string): string | null {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v)
  }
  removeItem(k: string): void {
    this.data.delete(k)
  }
  snapshot(): string {
    return JSON.stringify([...this.data.entries()].sort())
  }
}

/** Storage that throws on the Nth setItem call (to simulate a full disk). */
class FailingStorage extends MemoryStorage {
  calls = 0
  failOn: number
  constructor(failOn: number) {
    super()
    this.failOn = failOn
  }
  override setItem(k: string, v: string): void {
    this.calls++
    if (this.calls === this.failOn) throw new Error('QuotaExceededError')
    this.data.set(k, v)
  }
}

const newDish = (o: Partial<Omit<Dish, 'id' | 'custom'>> = {}): Omit<Dish, 'id' | 'custom'> => ({
  name: 'طبخة جديدة',
  meal: 'both',
  requires: [['meat']],
  eatWith: 'spoon',
  family: 'أخرى',
  duration: 'normal',
  season: 'all',
  fresh: false,
  ...o,
})

let storage: MemoryStorage
let store: ReturnType<typeof createStore>
let n = 0
const make = (s: StorageLike = storage) => createStore(s, seed, { newId: () => `id${++n}` })

beforeEach(() => {
  storage = new MemoryStorage()
  store = make()
})

describe('empty storage', () => {
  it('gives empty history, default settings and the built-in dishes', () => {
    expect(store.getHistory()).toEqual([])
    expect(store.getSettings()).toEqual({ marketDay: null })
    expect(store.getDishes()).toEqual(seed)
  })

  it('writes nothing just by reading', () => {
    store.getHistory()
    store.getSettings()
    store.getDishes()
    expect(storage.data.size).toBe(0)
  })
})

describe('history', () => {
  it('saves entries and keeps them after a restart (new store, same storage)', () => {
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'couscous-allouch' })
    expect(make().getHistory()).toEqual([{ date: '2026-11-10', meal: 'acha', dishId: 'couscous-allouch' }])
  })

  it('keeps entries sorted by date, with midday before dinner', () => {
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'a' })
    store.addHistory({ date: '2026-11-09', meal: 'acha', dishId: 'b' })
    store.addHistory({ date: '2026-11-10', meal: 'ftour', dishId: 'c' })
    expect(store.getHistory().map((e) => e.dishId)).toEqual(['b', 'c', 'a'])
  })

  it('returns entries sorted even if they were stored in another order', () => {
    storage.setItem(
      KEYS.history,
      JSON.stringify([
        { date: '2026-11-10', meal: 'acha', dishId: 'c' },
        { date: '2026-11-08', meal: 'acha', dishId: 'a' },
        { date: '2026-11-10', meal: 'ftour', dishId: 'b' },
      ]),
    )
    expect(store.getHistory().map((e) => e.dishId)).toEqual(['a', 'b', 'c'])
  })

  it('replaces the entry of the same day and meal', () => {
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'a' })
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'b' })
    expect(store.getHistory()).toEqual([{ date: '2026-11-10', meal: 'acha', dishId: 'b' }])
  })

  it('removes an entry by day and meal', () => {
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'a' })
    store.addHistory({ date: '2026-11-10', meal: 'ftour', dishId: 'b' })
    store.removeHistory('2026-11-10', 'acha')
    expect(store.getHistory().map((e) => e.dishId)).toEqual(['b'])
  })

  it('on unreadable JSON: returns empty and keeps the raw text aside, and a later write does not destroy it', () => {
    storage.setItem(KEYS.history, '{not json')
    expect(store.getHistory()).toEqual([])
    expect(storage.getItem(`${KEYS.history}.corrupt`)).toBe('{not json')
    store.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'a' })
    expect(storage.getItem(`${KEYS.history}.corrupt`)).toBe('{not json')
    expect(store.getHistory()).toHaveLength(1)
  })

  it('drops only the bad entries and keeps the good ones', () => {
    const good = { date: '2026-11-10', meal: 'acha', dishId: 'a' }
    storage.setItem(KEYS.history, JSON.stringify([good, { date: '2026-02-31', meal: 'acha', dishId: 'x' }, { nope: 1 }]))
    expect(store.getHistory()).toEqual([good])
    expect(storage.getItem(`${KEYS.history}.corrupt`)).not.toBeNull()
  })

  it('treats a non-array value as empty and keeps it aside', () => {
    storage.setItem(KEYS.history, '{"a":1}')
    expect(store.getHistory()).toEqual([])
    expect(storage.getItem(`${KEYS.history}.corrupt`)).toBe('{"a":1}')
  })
})

describe('settings', () => {
  it('saves the market day and keeps it after a restart', () => {
    store.setSettings({ marketDay: 0 })
    expect(make().getSettings()).toEqual({ marketDay: 0 })
    store.setSettings({ marketDay: null })
    expect(make().getSettings()).toEqual({ marketDay: null })
  })

  it('falls back to defaults when the stored value is invalid', () => {
    storage.setItem(KEYS.settings, '{"marketDay":9}')
    expect(store.getSettings()).toEqual({ marketDay: null })
    expect(storage.getItem(`${KEYS.settings}.corrupt`)).not.toBeNull()
  })
})

describe('last choices', () => {
  it('defaults to no protein and "any"', () => {
    expect(store.getLastChoices()).toEqual({ available: [], eatWith: 'any' })
  })

  it('remembers the last answers after a restart', () => {
    store.setLastChoices({ available: ['meat', 'egg'], eatWith: 'bread' })
    expect(make().getLastChoices()).toEqual({ available: ['meat', 'egg'], eatWith: 'bread' })
  })

  it('is not part of the backup file', () => {
    store.setLastChoices({ available: ['meat'], eatWith: 'spoon' })
    expect(store.exportData()).not.toContain('spoon')
  })
})

describe('mergeDishes', () => {
  it('applies edits to built-in dishes without changing the seed', () => {
    const before = JSON.stringify(seed)
    const merged = mergeDishes(seed, { added: [], edits: { [FIRST.id]: { favorite: true, name: 'كسكسي العائلة' } } })
    expect(merged[0]).toEqual({ ...FIRST, favorite: true, name: 'كسكسي العائلة' })
    expect(merged.slice(1)).toEqual(seed.slice(1))
    expect(JSON.stringify(seed)).toBe(before)
  })

  it('puts custom dishes after the built-in ones', () => {
    const custom: Dish = { ...newDish(), id: 'custom-x', custom: true }
    const merged = mergeDishes(seed, { added: [custom], edits: {} })
    expect(merged).toHaveLength(seed.length + 1)
    expect(merged.at(-1)).toEqual(custom)
  })

  it('ignores edits for dishes that are no longer in the built-in list', () => {
    expect(mergeDishes(seed, { added: [], edits: { gone: { favorite: true } } })).toEqual(seed)
  })
})

describe('dishes', () => {
  it('edits a built-in dish in a separate layer and keeps it after a restart', () => {
    store.updateDish(FIRST.id, { favorite: true })
    expect(make().getDishes()[0]).toEqual({ ...FIRST, favorite: true })
    expect(JSON.parse(storage.getItem(KEYS.dishes)!)).toEqual({ added: [], edits: { [FIRST.id]: { favorite: true } } })
  })

  it('combines several edits of the same dish', () => {
    store.updateDish(FIRST.id, { favorite: true })
    store.updateDish(FIRST.id, { duration: 'quick' })
    expect(store.getDishes()[0]).toMatchObject({ favorite: true, duration: 'quick' })
  })

  it('adds a custom dish with a unique id and custom = true', () => {
    const a = store.addDish(newDish({ name: 'أ' }))
    const b = store.addDish(newDish({ name: 'ب' }))
    expect(a.custom).toBe(true)
    expect(a.id).not.toBe(b.id)
    expect(make().getDishes().slice(-2).map((d) => d.name)).toEqual(['أ', 'ب'])
  })

  it('refuses an invalid new dish and writes nothing', () => {
    expect(() => store.addDish(newDish({ name: '   ' }))).toThrow(/Invalid dish/)
    expect(() => store.addDish(newDish({ requires: [[]] }))).toThrow(/Invalid dish/)
    expect(storage.data.size).toBe(0)
  })

  it('edits a custom dish in place', () => {
    const d = store.addDish(newDish())
    store.updateDish(d.id, { name: 'اسم جديد', favorite: true })
    expect(store.getDishes().at(-1)).toMatchObject({ id: d.id, name: 'اسم جديد', favorite: true, custom: true })
    expect(store.getUserDishes().added).toHaveLength(1)
  })

  it('throws for an unknown id and for an invalid edit', () => {
    expect(() => store.updateDish('nope', { favorite: true })).toThrow(/Unknown dish/)
    expect(() => store.updateDish(FIRST.id, { name: '' })).toThrow(/Invalid edit/)
  })

  it('removing a custom dish deletes it', () => {
    const d = store.addDish(newDish())
    store.removeDish(d.id)
    expect(store.getDishes()).toEqual(seed)
  })

  it('removing a built-in dish hides it, and reset brings it back', () => {
    store.removeDish(FIRST.id)
    expect(store.getDishes()[0].hidden).toBe(true)
    expect(store.getDishes()).toHaveLength(seed.length)
    store.resetDish(FIRST.id)
    expect(store.getDishes()).toEqual(seed)
  })

  it('falls back to the built-in list when the stored layer is invalid, and keeps the raw text', () => {
    storage.setItem(KEYS.dishes, '{"added":"oops"}')
    expect(store.getDishes()).toEqual(seed)
    expect(storage.getItem(`${KEYS.dishes}.corrupt`)).not.toBeNull()
  })
})

describe('export and import', () => {
  function fill(s: ReturnType<typeof createStore>) {
    s.addHistory({ date: '2026-11-09', meal: 'ftour', dishId: 'couscous-allouch' })
    s.addHistory({ date: '2026-11-10', meal: 'acha', dishId: 'chakchouka' })
    s.setSettings({ marketDay: 0 })
    s.updateDish(FIRST.id, { favorite: true })
    s.addDish(newDish({ name: 'طبخة الدار' }))
  }

  it('round trip: what you export is what you get after import into an empty app', () => {
    fill(store)
    const file = store.exportData(new Date('2026-11-10T10:00:00Z'))
    const other = new MemoryStorage()
    const store2 = make(other)
    const result = store2.importData(file)
    expect(result).toEqual({ ok: true, counts: { history: 2, added: 1, edited: 1 } })
    expect(store2.getHistory()).toEqual(store.getHistory())
    expect(store2.getSettings()).toEqual(store.getSettings())
    expect(store2.getDishes()).toEqual(store.getDishes())
  })

  it('writes a readable file with the app name and version', () => {
    const file = JSON.parse(store.exportData(new Date('2026-11-10T10:00:00Z')))
    expect(file).toMatchObject({ app: 'dbara', version: 1, exportedAt: '2026-11-10T10:00:00.000Z' })
  })

  it('import replaces the current data', () => {
    store.addHistory({ date: '2026-01-01', meal: 'acha', dishId: 'old' })
    const other = make(new MemoryStorage())
    fill(other)
    expect(store.importData(other.exportData()).ok).toBe(true)
    expect(store.getHistory().map((e) => e.dishId)).not.toContain('old')
    expect(store.getHistory()).toHaveLength(2)
  })

  it('import keeps one entry per day and meal (the last one wins)', () => {
    const file = JSON.parse(store.exportData())
    file.history = [
      { date: '2026-11-10', meal: 'acha', dishId: 'a' },
      { date: '2026-11-10', meal: 'acha', dishId: 'b' },
    ]
    expect(store.importData(JSON.stringify(file))).toMatchObject({ ok: true, counts: { history: 1 } })
    expect(store.getHistory()).toEqual([{ date: '2026-11-10', meal: 'acha', dishId: 'b' }])
  })

  describe('an invalid file changes nothing', () => {
    const base = () => {
      const s = make(new MemoryStorage())
      fill(s)
      return JSON.parse(s.exportData())
    }
    const bad: [string, (f: ReturnType<typeof base>) => unknown, string][] = [
      ['not JSON at all', () => 'this is not json {', 'not-json'],
      ['empty text', () => '', 'not-json'],
      ['JSON but not an object', () => '[1,2,3]', 'invalid-format'],
      ['another app', (f) => ({ ...f, app: 'other' }), 'invalid-format'],
      ['a newer version', (f) => ({ ...f, version: 2 }), 'invalid-format'],
      ['a missing section', (f) => ({ ...f, history: undefined }), 'invalid-format'],
      ['an impossible date', (f) => ({ ...f, history: [{ date: '2026-02-31', meal: 'acha', dishId: 'a' }] }), 'invalid-format'],
      ['an unknown meal', (f) => ({ ...f, history: [{ date: '2026-11-10', meal: 'lunch', dishId: 'a' }] }), 'invalid-format'],
      ['a wrong market day', (f) => ({ ...f, settings: { marketDay: 7 } }), 'invalid-format'],
      ['a custom dish with a bad field', (f) => ({ ...f, dishes: { ...f.dishes, added: [{ ...f.dishes.added[0], duration: 'forever' }] } }), 'invalid-format'],
      ['a custom dish that is not marked custom', (f) => ({ ...f, dishes: { ...f.dishes, added: [{ ...f.dishes.added[0], custom: false }] } }), 'invalid-format'],
      ['a custom dish using a built-in id', (f) => ({ ...f, dishes: { ...f.dishes, added: [{ ...f.dishes.added[0], id: FIRST.id }] } }), 'duplicate-id'],
      ['two custom dishes with the same id', (f) => ({ ...f, dishes: { ...f.dishes, added: [f.dishes.added[0], f.dishes.added[0]] } }), 'duplicate-id'],
    ]

    it.each(bad)('%s', (_name, mutate, code) => {
      fill(store)
      const before = storage.snapshot()
      const input = mutate(base())
      const result = store.importData(typeof input === 'string' ? input : JSON.stringify(input))
      expect(result).toMatchObject({ ok: false, code })
      expect(storage.snapshot()).toBe(before)
    })
  })

  it('explains where the problem is', () => {
    const file = JSON.parse(store.exportData())
    file.history = [{ date: '2026-02-31', meal: 'acha', dishId: 'a' }]
    const r = store.importData(JSON.stringify(file))
    expect(r).toMatchObject({ ok: false, code: 'invalid-format' })
    expect(r.ok ? '' : r.detail).toContain('history.0.date')
  })

  it('puts the old data back if the storage fails half way', () => {
    const source = make(new MemoryStorage())
    fill(source)
    const file = source.exportData()

    for (const failOn of [1, 2, 3]) {
      const flaky = new FailingStorage(failOn + 2) // 2 writes of setup below, then the Nth write of the import
      const s = make(flaky)
      s.addHistory({ date: '2026-01-01', meal: 'acha', dishId: 'keep-me' })
      s.setSettings({ marketDay: 3 })
      const before = flaky.snapshot()
      const result = s.importData(file)
      expect(result, `fail on write ${failOn}`).toMatchObject({ ok: false, code: 'write-failed' })
      expect(flaky.snapshot(), `fail on write ${failOn}`).toBe(before)
    }
  })

  it('removes keys that did not exist before when it rolls back', () => {
    const source = make(new MemoryStorage())
    fill(source)
    const flaky = new FailingStorage(3) // history and settings are written, the dishes write fails
    const s = make(flaky)
    expect(s.importData(source.exportData())).toMatchObject({ ok: false, code: 'write-failed' })
    expect(flaky.data.size).toBe(0)
  })
})
