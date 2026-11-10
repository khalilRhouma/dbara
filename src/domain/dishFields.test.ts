import { describe, expect, it } from 'vitest'
import { cleanDays, cleanRequires, diffFields, type DishFields } from './dishFields'
import type { Dish } from './types'

const dish: Dish = {
  id: 'x', name: 'كسكسي', meal: 'ftour', requires: [['meat']], eatWith: 'spoon',
  family: 'كسكسي', duration: 'long', season: 'all', fresh: false, description: 'كسكسي، لحم', days: [5],
}
const fields = (o: Partial<DishFields> = {}): DishFields => ({
  name: dish.name, meal: dish.meal, requires: dish.requires, eatWith: dish.eatWith,
  family: dish.family, duration: dish.duration, season: dish.season, fresh: dish.fresh,
  description: dish.description, days: dish.days, ...o,
})

describe('cleanRequires', () => {
  it('drops empty groups', () => {
    expect(cleanRequires([[], ['meat'], []])).toEqual([['meat']])
  })
  it('drops repeated proteins and repeated groups', () => {
    expect(cleanRequires([['meat', 'meat', 'chicken'], ['chicken', 'meat'], ['egg']])).toEqual([['meat', 'chicken'], ['egg']])
  })
  it('keeps "no protein" as an empty list', () => {
    expect(cleanRequires([[]])).toEqual([])
  })
})

describe('diffFields', () => {
  it('is empty when nothing changed', () => {
    expect(diffFields(dish, fields())).toEqual({})
  })
  it('contains only the changed fields', () => {
    expect(diffFields(dish, fields({ duration: 'quick', fresh: true }))).toEqual({ duration: 'quick', fresh: true })
  })
  it('compares protein groups by content and cleans them', () => {
    expect(diffFields(dish, fields({ requires: [['meat'], []] }))).toEqual({})
    expect(diffFields(dish, fields({ requires: [['meat', 'chicken']] }))).toEqual({ requires: [['meat', 'chicken']] })
    expect(diffFields(dish, fields({ requires: [] }))).toEqual({ requires: [] })
  })
  it('trims the name and family', () => {
    expect(diffFields(dish, fields({ name: '  كسكسي  ', family: ' كسكسي ' }))).toEqual({})
    expect(diffFields(dish, fields({ name: ' كسكسي بالحوت ' }))).toEqual({ name: 'كسكسي بالحوت' })
  })
})

describe('cleanDays', () => {
  it('sorts and removes repeats', () => {
    expect(cleanDays([5, 1, 5, 0])).toEqual([0, 1, 5])
    expect(cleanDays(undefined)).toEqual([])
  })
})

describe('diffFields: description and days', () => {
  it('detects a changed description and trims it', () => {
    expect(diffFields(dish, fields({ description: '  كسكسي، دجاج  ' }))).toEqual({ description: 'كسكسي، دجاج' })
    expect(diffFields(dish, fields({ description: ' كسكسي، لحم ' }))).toEqual({})
  })
  it('stores a cleared description as an empty string', () => {
    expect(diffFields(dish, fields({ description: '' }))).toEqual({ description: '' })
    expect(diffFields({ ...dish, description: undefined }, fields({ description: '' }))).toEqual({})
  })
  it('detects changed days and compares them as sets', () => {
    expect(diffFields(dish, fields({ days: [5, 5] }))).toEqual({})
    expect(diffFields(dish, fields({ days: [0, 5] }))).toEqual({ days: [0, 5] })
    expect(diffFields(dish, fields({ days: [] }))).toEqual({ days: [] })
    expect(diffFields({ ...dish, days: undefined }, fields({ days: [] }))).toEqual({})
  })
})
