import * as v from 'valibot'
import type { Dish, HistoryEntry, Meal, Settings } from '../domain/types'
import {
  BackupSchema,
  CustomDishSchema,
  LastChoicesSchema,
  DishEditSchema,
  HistoryEntrySchema,
  SettingsSchema,
  UserDishesSchema,
  firstIssue,
  type Backup,
  type DishEdit,
  type LastChoices,
  type UserDishes,
} from './schemas'

// Keys are versioned. If the format ever changes, bump v1 → v2 and migrate.
export const KEYS = {
  history: 'dbara.v1.history',
  dishes: 'dbara.v1.dishes', // only what the user changed or added, never a copy of the built-in list
  settings: 'dbara.v1.settings',
  last: 'dbara.v1.last', // last protein / eat-with answers; a convenience, not exported
} as const

/** The part of the Web Storage API we use, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type ImportResult =
  | { ok: true; counts: { history: number; added: number; edited: number } }
  | { ok: false; code: 'not-json' | 'invalid-format' | 'duplicate-id' | 'write-failed'; detail?: string }

const DEFAULT_SETTINGS: Settings = { marketDay: null }
const DEFAULT_LAST: LastChoices = { available: [], eatWith: 'any' }
const EMPTY_USER_DISHES: UserDishes = { added: [], edits: {} }
const MEAL_ORDER: Record<Meal, number> = { ftour: 0, acha: 1 }

/**
 * Built-in dishes + the user's layer.
 * - A built-in dish takes the user's edits (favorite, hidden, renamed...).
 * - Edits for ids that no longer exist are ignored.
 * - Custom dishes come after the built-in ones.
 * Pure: never changes `seed`.
 */
export function mergeDishes(seed: Dish[], user: UserDishes): Dish[] {
  const merged = seed.map((d) => {
    const edit = user.edits[d.id]
    return edit ? { ...d, ...stripUndefined(edit) } : d
  })
  return [...merged, ...user.added]
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, val]) => val !== undefined)) as T
}

export function createStore(storage: StorageLike, seed: Dish[], opts: { newId?: () => string } = {}) {
  const newId = opts.newId ?? (() => crypto.randomUUID())

  /** Keep the raw text of anything we could not read, once, so a later write cannot destroy it. */
  function quarantine(key: string, raw: string) {
    try {
      if (storage.getItem(`${key}.corrupt`) === null) storage.setItem(`${key}.corrupt`, raw)
    } catch {
      // nothing more we can do
    }
  }

  function readJson(key: string): unknown {
    const raw = storage.getItem(key)
    if (raw === null) return undefined
    try {
      return JSON.parse(raw)
    } catch {
      quarantine(key, raw)
      return undefined
    }
  }

  function readValid<T>(key: string, schema: v.GenericSchema<unknown, T>, fallback: T): T {
    const parsed = readJson(key)
    if (parsed === undefined) return fallback
    const r = v.safeParse(schema, parsed)
    if (r.success) return r.output
    quarantine(key, JSON.stringify(parsed))
    return fallback
  }

  function write(key: string, value: unknown) {
    storage.setItem(key, JSON.stringify(value))
  }

  // ---- History ----
  const sortHistory = (h: HistoryEntry[]) =>
    [...h].sort((a, b) => a.date.localeCompare(b.date) || MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal])

  /** Oldest first, whatever order was stored. Entries that fail validation are dropped (and the raw text is kept aside). */
  function getHistory(): HistoryEntry[] {
    const parsed = readJson(KEYS.history)
    if (!Array.isArray(parsed)) {
      if (parsed !== undefined) quarantine(KEYS.history, JSON.stringify(parsed))
      return []
    }
    const good: HistoryEntry[] = []
    for (const item of parsed) {
      const r = v.safeParse(HistoryEntrySchema, item)
      if (r.success) good.push(r.output)
    }
    if (good.length !== parsed.length) quarantine(KEYS.history, JSON.stringify(parsed))
    return sortHistory(good)
  }

  /** One entry per day and meal: adding again for the same day and meal replaces the old one. */
  function addHistory(entry: HistoryEntry): void {
    const others = getHistory().filter((e) => !(e.date === entry.date && e.meal === entry.meal))
    write(KEYS.history, sortHistory([...others, entry]))
  }

  function removeHistory(date: string, meal: Meal): void {
    write(KEYS.history, getHistory().filter((e) => !(e.date === date && e.meal === meal)))
  }

  // ---- Settings ----
  const getSettings = (): Settings => readValid(KEYS.settings, SettingsSchema, DEFAULT_SETTINGS)
  const setSettings = (patch: Partial<Settings>): void => write(KEYS.settings, { ...getSettings(), ...patch })

  // ---- Last answers (defaults for the next time) ----
  const getLastChoices = (): LastChoices => readValid(KEYS.last, LastChoicesSchema, DEFAULT_LAST)
  const setLastChoices = (c: LastChoices): void => write(KEYS.last, c)

  // ---- Dishes ----
  const getUserDishes = (): UserDishes => readValid(KEYS.dishes, UserDishesSchema, EMPTY_USER_DISHES)
  const getDishes = (): Dish[] => mergeDishes(seed, getUserDishes())

  /** Edit any dish. Built-in dishes keep the edit in a separate layer; custom dishes are changed in place. */
  function updateDish(id: string, edit: DishEdit): void {
    const user = getUserDishes()
    const customIndex = user.added.findIndex((d) => d.id === id)
    if (customIndex >= 0) {
      const next = { ...user.added[customIndex], ...stripUndefined(edit) }
      const r = v.safeParse(CustomDishSchema, next)
      if (!r.success) throw new Error(`Invalid dish: ${firstIssue(r.issues)}`)
      write(KEYS.dishes, { ...user, added: user.added.map((d, i) => (i === customIndex ? r.output : d)) })
    } else if (seed.some((d) => d.id === id)) {
      const r = v.safeParse(DishEditSchema, { ...user.edits[id], ...stripUndefined(edit) })
      if (!r.success) throw new Error(`Invalid edit: ${firstIssue(r.issues)}`)
      write(KEYS.dishes, { ...user, edits: { ...user.edits, [id]: r.output } })
    } else {
      throw new Error(`Unknown dish: ${id}`)
    }
  }

  function addDish(input: Omit<Dish, 'id' | 'custom'>): Dish {
    const dish = { ...input, id: `custom-${newId()}`, custom: true as const }
    const r = v.safeParse(CustomDishSchema, dish)
    if (!r.success) throw new Error(`Invalid dish: ${firstIssue(r.issues)}`)
    const user = getUserDishes()
    write(KEYS.dishes, { ...user, added: [...user.added, r.output] })
    return r.output
  }

  /** Custom dishes are deleted. Built-in dishes are hidden (they can come back with resetDish). */
  function removeDish(id: string): void {
    const user = getUserDishes()
    if (user.added.some((d) => d.id === id)) {
      write(KEYS.dishes, { ...user, added: user.added.filter((d) => d.id !== id) })
    } else {
      updateDish(id, { hidden: true })
    }
  }

  /** Drop all the user's edits of a built-in dish. */
  function resetDish(id: string): void {
    const user = getUserDishes()
    const edits = Object.fromEntries(Object.entries(user.edits).filter(([key]) => key !== id))
    write(KEYS.dishes, { ...user, edits })
  }

  // ---- Backup ----
  function exportData(now: Date = new Date()): string {
    const backup: Backup = {
      app: 'dbara',
      version: 1,
      exportedAt: now.toISOString(),
      history: getHistory(),
      settings: getSettings(),
      dishes: getUserDishes(),
    }
    return JSON.stringify(backup, null, 2)
  }

  /**
   * Replaces history, settings and the user's dishes with the file's content.
   * The whole file is checked first and nothing is written if anything is wrong.
   * If a write fails half way (storage full), the old values are put back.
   */
  function importData(text: string): ImportResult {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return { ok: false, code: 'not-json' }
    }
    const r = v.safeParse(BackupSchema, json)
    if (!r.success) return { ok: false, code: 'invalid-format', detail: firstIssue(r.issues) }
    const backup = r.output

    const seedIds = new Set(seed.map((d) => d.id))
    const seen = new Set<string>()
    for (const d of backup.dishes.added) {
      if (seedIds.has(d.id) || seen.has(d.id)) return { ok: false, code: 'duplicate-id', detail: d.id }
      seen.add(d.id)
    }

    // One entry per day and meal; the last one in the file wins.
    const byKey = new Map(backup.history.map((e) => [`${e.date}|${e.meal}`, e]))
    const history = sortHistory([...byKey.values()])

    const previous = [KEYS.history, KEYS.settings, KEYS.dishes].map((k) => [k, storage.getItem(k)] as const)
    try {
      write(KEYS.history, history)
      write(KEYS.settings, backup.settings)
      write(KEYS.dishes, backup.dishes)
    } catch (e) {
      for (const [k, old] of previous) {
        try {
          if (old === null) storage.removeItem(k)
          else storage.setItem(k, old)
        } catch {
          // best effort
        }
      }
      return { ok: false, code: 'write-failed', detail: e instanceof Error ? e.message : String(e) }
    }
    return {
      ok: true,
      counts: { history: history.length, added: backup.dishes.added.length, edited: Object.keys(backup.dishes.edits).length },
    }
  }

  return {
    getHistory, addHistory, removeHistory,
    getSettings, setSettings,
    getLastChoices, setLastChoices,
    getDishes, getUserDishes, updateDish, addDish, removeDish, resetDish,
    exportData, importData,
  }
}

export type Store = ReturnType<typeof createStore>
