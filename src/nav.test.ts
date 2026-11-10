import { describe, expect, it } from 'vitest'
import { TABS } from './nav'

describe('TABS', () => {
  it('has the four bottom-nav buttons in order', () => {
    expect(TABS.map((t) => t.id)).toEqual(['today', 'history', 'dishes', 'settings'])
  })

  it('has a non-empty Arabic label for each button', () => {
    for (const t of TABS) expect(t.label).toMatch(/\p{Script=Arabic}/u)
  })
})
