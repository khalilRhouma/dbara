import * as v from 'valibot'
import { isValidISODate } from '../domain/dates'
import { DURATIONS, EAT_WITH, FREQUENCIES, MEALS, PROTEINS, SEASONS, VEGETABLES, WEEKDAYS, type Dish, type HistoryEntry, type Settings } from '../domain/types'

// Validation of everything that comes from outside the app: localStorage and imported files.
// Library: valibot (small, tree-shakeable, TypeScript-first).

const nonEmpty = v.pipe(v.string(), v.trim(), v.minLength(1))

const dishFields = {
  name: nonEmpty,
  meal: v.picklist([...MEALS, 'both']),
  // AND between groups, OR inside a group; no empty group.
  requires: v.array(v.pipe(v.array(v.picklist(PROTEINS)), v.minLength(1))),
  eatWith: v.picklist(EAT_WITH),
  family: nonEmpty,
  duration: v.picklist(DURATIONS),
  season: v.picklist(SEASONS),
  fresh: v.boolean(),
  vegetables: v.optional(
    v.pipe(
      v.array(v.picklist(VEGETABLES)),
      v.check((d) => new Set(d).size === d.length, 'repeated vegetable'),
    ),
  ),
  frequency: v.optional(v.picklist(FREQUENCIES)),
  heavy: v.optional(v.boolean()),
  description: v.optional(v.pipe(v.string(), v.trim())),
  days: v.optional(
    v.pipe(
      v.array(v.picklist(WEEKDAYS)),
      v.check((d) => new Set(d).size === d.length, 'repeated day'),
    ),
  ),
  favorite: v.optional(v.boolean()),
  hidden: v.optional(v.boolean()),
}

/** A dish added by the user. `custom` must be true. */
export const CustomDishSchema: v.GenericSchema<unknown, Dish> = v.object({
  id: v.pipe(v.string(), v.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)),
  ...dishFields,
  custom: v.literal(true),
})

/** Changes the user made to a built-in dish. Any field except id and custom. */
export const DishEditSchema = v.partial(v.object(dishFields))

export const HistoryEntrySchema: v.GenericSchema<unknown, HistoryEntry> = v.object({
  date: v.pipe(v.string(), v.check(isValidISODate, 'not a real YYYY-MM-DD date')),
  meal: v.picklist(MEALS),
  dishId: nonEmpty,
})

export const SettingsSchema: v.GenericSchema<unknown, Settings> = v.object({
  marketDay: v.nullable(v.picklist([0, 1, 2, 3, 4, 5, 6])),
})

/** Last answers to the protein and eat-with questions, used as defaults next time. Not part of backups. */
export const LastChoicesSchema = v.object({
  available: v.array(v.picklist(PROTEINS)),
  eatWith: v.picklist([...EAT_WITH, 'any']),
})
export type LastChoices = v.InferOutput<typeof LastChoicesSchema>

export const UserDishesSchema = v.object({
  added: v.array(CustomDishSchema),
  edits: v.record(v.string(), DishEditSchema),
})

/** The backup file written by "export" and read by "import". */
export const BackupSchema = v.object({
  app: v.literal('dbara'),
  version: v.literal(1),
  exportedAt: v.string(),
  history: v.array(HistoryEntrySchema),
  settings: SettingsSchema,
  dishes: UserDishesSchema,
})

export type DishEdit = v.InferOutput<typeof DishEditSchema>
export type UserDishes = v.InferOutput<typeof UserDishesSchema>
export type Backup = v.InferOutput<typeof BackupSchema>

/** One readable line for the first problem found, e.g. "history.3.date: not a real YYYY-MM-DD date". */
export function firstIssue(issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]): string {
  const issue = issues[0]
  const path = v.getDotPath(issue)
  return path ? `${path}: ${issue.message}` : issue.message
}
