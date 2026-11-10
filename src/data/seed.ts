import type { Dish } from '../domain/types'
import dishesJson from './dishes.json'

/** The built-in dishes. Validated against docs/dishes.md by dishes.test.ts. */
export const seedDishes = dishesJson as Dish[]
