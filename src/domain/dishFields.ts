import type { DishEdit } from '../storage/schemas'
import type { Dish, Protein, Weekday } from './types'

/** The fields the dish form edits. (favorite and hidden have their own buttons in the list.) */
export type DishFields = Pick<
  Dish,
  'name' | 'meal' | 'requires' | 'eatWith' | 'family' | 'duration' | 'season' | 'fresh' | 'description' | 'days'
>

/** Remove empty groups, repeated proteins inside a group, and repeated groups. */
export function cleanRequires(groups: Protein[][]): Protein[][] {
  const seen = new Set<string>()
  const out: Protein[][] = []
  for (const g of groups) {
    const unique = [...new Set(g)]
    if (unique.length === 0) continue
    const key = [...unique].sort().join(',')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(unique)
  }
  return out
}

/** Days in week order, without repeats. */
export function cleanDays(days: Weekday[] | undefined): Weekday[] {
  return [...new Set(days ?? [])].sort((a, b) => a - b)
}

/** Only the fields that changed. This is what is saved as the user's edit of a built-in dish. */
export function diffFields(current: Dish, next: DishFields): DishEdit {
  const edit: Record<string, unknown> = {}
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const compare = (key: string, before: unknown, after: unknown) => {
    if (!same(before, after)) edit[key] = after
  }
  compare('name', current.name, next.name.trim())
  compare('meal', current.meal, next.meal)
  compare('requires', current.requires, cleanRequires(next.requires))
  compare('eatWith', current.eatWith, next.eatWith)
  compare('family', current.family, next.family.trim())
  compare('duration', current.duration, next.duration)
  compare('season', current.season, next.season)
  compare('fresh', current.fresh, next.fresh)
  // "no description" and "no days" are stored as '' and [] so that clearing a built-in value works.
  compare('description', current.description ?? '', (next.description ?? '').trim())
  compare('days', cleanDays(current.days), cleanDays(next.days))
  return edit as DishEdit
}
