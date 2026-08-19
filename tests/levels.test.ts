import { describe, it, expect } from 'vitest'
import { LOG_LEVELS, isLevelEnabled, levelNameOf } from '../src/logger/levels'

describe('levels', () => {
  it('orders levels numerically', () => {
    expect(LOG_LEVELS.TRACE).toBe(10)
    expect(LOG_LEVELS.DEBUG).toBe(20)
    expect(LOG_LEVELS.INFO).toBe(30)
    expect(LOG_LEVELS.WARN).toBe(40)
    expect(LOG_LEVELS.ERROR).toBe(50)
    expect(LOG_LEVELS.FATAL).toBe(60)
  })

  it('enables a level at or above the threshold', () => {
    expect(isLevelEnabled(LOG_LEVELS.ERROR, LOG_LEVELS.WARN)).toBe(true)
    expect(isLevelEnabled(LOG_LEVELS.WARN, LOG_LEVELS.WARN)).toBe(true)
    expect(isLevelEnabled(LOG_LEVELS.DEBUG, LOG_LEVELS.WARN)).toBe(false)
  })

  it('maps a numeric level back to its name', () => {
    expect(levelNameOf(LOG_LEVELS.FATAL)).toBe('FATAL')
    expect(levelNameOf(99)).toBe('INFO')
  })
})