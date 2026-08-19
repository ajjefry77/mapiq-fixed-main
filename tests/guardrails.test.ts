import { describe, it, expect } from 'vitest'
import { Deduplicator } from '../src/logger/dedup'
import { shouldSample } from '../src/logger/sampling'
import { classifyDuration } from '../src/logger/perf'

describe('dedup: duplicate-error detection', () => {
  it('allows occurrences up to the window cap, then suppresses', () => {
    const dedup = new Deduplicator(1000, 3)
    expect(dedup.shouldLog('sig')).toBe(true)
    expect(dedup.shouldLog('sig')).toBe(true)
    expect(dedup.shouldLog('sig')).toBe(true)
    expect(dedup.shouldLog('sig')).toBe(false) // 4th — rate limited
    expect(dedup.shouldLog('sig')).toBe(false)
    expect(dedup.occurrences('sig')).toBe(5)
  })

  it('resets its budget when the window expires', () => {
    const dedup = new Deduplicator(50, 1)
    expect(dedup.shouldLog('sig', 0)).toBe(true)
    expect(dedup.shouldLog('sig', 10)).toBe(false)
    expect(dedup.shouldLog('sig', 60)).toBe(true) // new window
    expect(dedup.shouldLog('sig', 70)).toBe(false)
  })

  it('treats distinct signatures independently', () => {
    const dedup = new Deduplicator(1000, 1)
    expect(dedup.shouldLog('a')).toBe(true)
    expect(dedup.shouldLog('a')).toBe(false)
    expect(dedup.shouldLog('b')).toBe(true)
  })
})

describe('sampling', () => {
  it('is a pass-through at rate 1 and a block at rate 0', () => {
    expect(shouldSample('x', 1, 'seed')).toBe(true)
    expect(shouldSample('x', 0, 'seed')).toBe(false)
  })

  it('is deterministic for the same (event, seed)', () => {
    const first = shouldSample('map.tile.loaded', 0.5, 'req-42')
    for (let i = 0; i < 20; i++) {
      expect(shouldSample('map.tile.loaded', 0.5, 'req-42')).toBe(first)
    }
  })

  it('samples roughly in proportion at rate 0.5 with varied seeds', () => {
    let accepted = 0
    for (let i = 0; i < 2000; i++) {
      if (shouldSample('map.tile.loaded', 0.5, `seed-${i}`)) accepted++
    }
    expect(accepted).toBeGreaterThan(800)
    expect(accepted).toBeLessThan(1200)
  })
})

describe('perf classification', () => {
  it('buckets durations against the API thresholds', () => {
    expect(classifyDuration(100)).toBe('normal')
    expect(classifyDuration(700)).toBe('slow')
    expect(classifyDuration(2000)).toBe('critical')
  })
})