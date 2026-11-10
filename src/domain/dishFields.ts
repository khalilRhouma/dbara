import type { DishEdit } from '../storage/schemas'
import type { Dish, Protein } from './types'

/** The fields the dish form edits. (favorite and hidden have their own buttons in the list.) */
export type DishFields = Pick<Dish, 'name' | 'meal' | 'requires' | 'eatWith' | 'family' | 'duration' | 'season' | 'fresh'>

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

/** Only the fields that changed. This is what is saved as the user's edit of a built-in dish. */
export function diffFields(current: Dish, next: DishFields): DishEdit {
  const edit: Record<string, unknown> = {}
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  for (const key of ['name', 'meal', 'requires', 'eatWith', 'family', 'duration', 'season', 'fresh'] as const) {
    const value = key === 'requires' ? cleanRequires(next.requires) : key === 'name' || key === 'family' ? next[key].trim() : next[key]
    if (!same(current[key], value)) edit[key] = value
  }
  return edit as DishEdit
}
