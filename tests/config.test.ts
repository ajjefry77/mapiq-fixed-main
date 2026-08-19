import { describe, it, expect } from 'vitest'
import { naturalLevelForEnvironment } from '../src/logger/config'
import { LOG_LEVELS } from '../src/logger/levels'

describe('environment-based logging', () => {
  it('maps environments to safe production thresholds', () => {
    // development keeps noise; production is restricted to operational logs.
    expect(naturalLevelForEnvironment('development')).toBe(LOG_LEVELS.DEBUG)
    expect(naturalLevelForEnvironment('test')).toBe(LOG_LEVELS.INFO)
    expect(naturalLevelForEnvironment('staging')).toBe(LOG_LEVELS.INFO)
    expect(naturalLevelForEnvironment('production')).toBe(LOG_LEVELS.WARN)
  })
})