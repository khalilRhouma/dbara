import { Beef, Clock, Drumstick, Egg, Fish, FishSymbol, Hourglass, Moon, Shuffle, Soup, Sun, Wheat, Zap, type LucideIcon } from 'lucide-react'
import type { Duration, EatWith, Meal, Protein } from '../domain/types'

// One place that decides which icon goes with which choice.
export const MEAL_ICON: Record<Meal, LucideIcon> = { ftour: Sun, acha: Moon }
export const PROTEIN_ICON: Record<Protein, LucideIcon> = { meat: Beef, chicken: Drumstick, fish: Fish, egg: Egg, tuna: FishSymbol }
export const EAT_WITH_ICON: Record<EatWith | 'any', LucideIcon> = { spoon: Soup, bread: Wheat, any: Shuffle }
export const DURATION_ICON: Record<Duration, LucideIcon> = { quick: Zap, normal: Clock, long: Hourglass }
