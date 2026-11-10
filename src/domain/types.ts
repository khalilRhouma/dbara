// Data types for Dbara. Source: docs/PLAN.md ("أنواع البيانات").

export const MEALS = ['ftour', 'acha'] as const; // ftour = midday meal, acha = dinner
export const PROTEINS = ['meat', 'chicken', 'fish', 'egg', 'tuna'] as const;
export const EAT_WITH = ['spoon', 'bread'] as const;
export const DURATIONS = ['quick', 'normal', 'long'] as const;
export const SEASONS = ['all', 'winter', 'summer'] as const;

export type Meal = (typeof MEALS)[number]
export type Protein = (typeof PROTEINS)[number]
export type EatWith = (typeof EAT_WITH)[number]
export type Duration = (typeof DURATIONS)[number]
export type Season = (typeof SEASONS)[number]
/** 0 = Sunday ... 6 = Saturday (same as Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export interface Dish {
  id: string // stable slug, e.g. "couscous-allouch"
  name: string // Arabic name
  meal: Meal | 'both'
  // AND between groups, OR inside a group.
  // "meat or chicken"        = [['meat','chicken']]
  // "egg with meat or chicken" = [['egg'],['meat','chicken']]
  // "none" or optional protein = []
  requires: Protein[][]
  eatWith: EatWith
  family: string // couscous, pasta, stew...
  duration: Duration
  season: Season
  fresh: boolean // needs fish or vegetables from the market
  description?: string // short list of the main components, shown on the cards
  days?: Weekday[] // days the family likes this dish (e.g. couscous on Friday)
  favorite?: boolean
  hidden?: boolean
  custom?: boolean // added by the user
}

export interface HistoryEntry {
  date: string // YYYY-MM-DD, local time
  meal: Meal
  dishId: string
}

export interface Settings {
  marketDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null // 0 = Sunday
}

export interface AskInput {
  meal: Meal
  available: Protein[] // empty = none
  eatWith: EatWith | 'any'
  maxDuration: Duration // default 'long' = no limit
}
