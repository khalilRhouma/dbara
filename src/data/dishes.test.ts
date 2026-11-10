import { describe, expect, it } from 'vitest'
import tableMd from '../../docs/dishes.md?raw'
import dishesJson from './dishes.json'
import { DURATIONS, EAT_WITH, FREQUENCIES, MEALS, PROTEINS, SEASONS, WEEKDAYS, type Dish } from '../domain/types'

const dishes = dishesJson as Dish[]

// Rows of the Markdown table in docs/dishes.md.
const tableRows = tableMd
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| الطبخة'))
  .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
const tableNames = tableRows.map((r) => r[0])

describe('dishes.json', () => {
  it('has as many dishes as the table in docs/dishes.md, in the same order', () => {
    expect(tableNames.length).toBeGreaterThan(0)
    expect(dishes.map((d) => d.name)).toEqual(tableNames)
  })

  it('is in sync with the table: same ids and descriptions (run `npm run dishes` after editing the table)', () => {
    expect(dishes.map((d) => d.id)).toEqual(tableRows.map((r) => r[12]))
    expect(dishes.map((d) => d.description)).toEqual(tableRows.map((r) => r[10]))
  })

  it('gives every dish a short description', () => {
    for (const d of dishes) {
      expect(d.description?.trim(), d.id).toBeTruthy()
      expect(d.description!.length, d.id).toBeLessThanOrEqual(90)
    }
  })

  it('has unique, slug-shaped ids', () => {
    const ids = dishes.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('uses only allowed values', () => {
    for (const d of dishes) {
      expect([...MEALS, 'both'], d.id).toContain(d.meal)
      expect(EAT_WITH, d.id).toContain(d.eatWith)
      expect(DURATIONS, d.id).toContain(d.duration)
      expect(SEASONS, d.id).toContain(d.season)
      expect(typeof d.fresh, d.id).toBe('boolean')
      expect(d.name.trim(), d.id).not.toBe('')
      expect(d.family.trim(), d.id).not.toBe('')
    }
  })

  it('has valid protein requirements (non-empty groups, known proteins)', () => {
    for (const d of dishes) {
      for (const group of d.requires) {
        expect(group.length, d.id).toBeGreaterThan(0)
        for (const p of group) expect(PROTEINS, d.id).toContain(p)
        expect(new Set(group).size, d.id).toBe(group.length)
      }
    }
  })

  it('uses only allowed frequencies, and marks heavy dishes with true only', () => {
    for (const d of dishes) {
      if (d.frequency !== undefined) expect(FREQUENCIES, d.id).toContain(d.frequency)
      if (d.heavy !== undefined) expect(d.heavy, d.id).toBe(true)
    }
  })

  it('has valid favorite days', () => {
    for (const d of dishes) {
      for (const day of d.days ?? []) expect(WEEKDAYS, d.id).toContain(day)
      expect(new Set(d.days ?? []).size, d.id).toBe((d.days ?? []).length)
    }
  })

  it('has no stray fields (user flags are not in the seed data)', () => {
    const allowed = new Set(['id', 'name', 'meal', 'requires', 'eatWith', 'family', 'duration', 'season', 'fresh', 'frequency', 'heavy', 'description', 'days'])
    for (const d of dishes) for (const k of Object.keys(d)) expect(allowed.has(k), `${d.id}.${k}`).toBe(true)
  })
})
