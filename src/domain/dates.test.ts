import { describe, expect, it } from 'vitest'
import { daysBetween, daysSinceMarketDay, isValidISODate, seasonOf, toISODate } from './dates'

describe('toISODate', () => {
  it('uses local date parts and zero-pads', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 10, 10, 0, 1))).toBe('2026-11-10')
  })
})

describe('daysBetween', () => {
  it('counts calendar days, forwards and backwards', () => {
    expect(daysBetween('2026-11-10', '2026-11-10')).toBe(0)
    expect(daysBetween('2026-11-07', '2026-11-10')).toBe(3)
    expect(daysBetween('2026-11-10', '2026-11-07')).toBe(-3)
  })

  it('crosses month and year ends', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3)
  })

  it('is not affected by daylight saving changes', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('seasonOf', () => {
  it('winter is Nov to Mar', () => {
    for (const m of [10, 11, 0, 1, 2]) expect(seasonOf(new Date(2026, m, 15))).toBe('winter')
  })
  it('summer is Jun to Sep', () => {
    for (const m of [5, 6, 7, 8]) expect(seasonOf(new Date(2026, m, 15))).toBe('summer')
  })
  it('April, May and October are neutral', () => {
    for (const m of [3, 4, 9]) expect(seasonOf(new Date(2026, m, 15))).toBe('neutral')
  })
})

describe('daysSinceMarketDay', () => {
  // 2026-11-10 is a Tuesday (getDay() = 2)
  const tuesday = new Date(2026, 10, 10, 12)
  it('is 0 on the market day itself', () => {
    expect(daysSinceMarketDay(tuesday, 2)).toBe(0)
  })
  it('counts days since the last market day', () => {
    expect(daysSinceMarketDay(tuesday, 1)).toBe(1) // Monday
    expect(daysSinceMarketDay(tuesday, 0)).toBe(2) // Sunday
  })
  it('wraps around the week', () => {
    expect(daysSinceMarketDay(tuesday, 3)).toBe(6) // last Wednesday
  })
})

describe('isValidISODate', () => {
  it('accepts real dates, including 29 February in a leap year', () => {
    expect(isValidISODate('2026-11-10')).toBe(true)
    expect(isValidISODate('2028-02-29')).toBe(true)
  })
  it('rejects impossible dates and wrong formats', () => {
    for (const s of ['2026-02-31', '2027-02-29', '2026-13-01', '2026-00-10', '2026-1-5', '10/11/2026', '', 'abc']) {
      expect(isValidISODate(s), s).toBe(false)
    }
  })
})
