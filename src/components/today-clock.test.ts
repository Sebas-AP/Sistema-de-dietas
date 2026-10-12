import { describe, expect, it } from 'vitest'
import { millisecondsUntilNextMinute } from './today-clock'

describe('millisecondsUntilNextMinute', () => {
  it('waits only until the next minute boundary', () => {
    expect(millisecondsUntilNextMinute(new Date('2026-10-12T12:59:59.250'))).toBe(750)
  })

  it('waits a full minute when already on a boundary', () => {
    expect(millisecondsUntilNextMinute(new Date('2026-10-12T13:00:00.000'))).toBe(60_000)
  })
})
