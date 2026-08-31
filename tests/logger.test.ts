import { describe, it, expect } from 'vitest'
import {
  Logger,
  resolveConfig,
  LOG_LEVELS,
  EV,
  isLevelEnabled,
  levelNameOf,
} from '../src/logger'
import {
  errorToInfo,
  maskInlineSecrets,
  sanitizeContext,
  sanitizeMessage,
  sanitizeUrl,
  stripControlChars,
} from '../src/logger'
import type { LogEntry, Transport } from '../src/logger'

function makeLogger(level = LOG_LEVELS.DEBUG, capture: LogEntry[] = []): Logger {
  const transport: Transport = {
    name: 'test',
    level: LOG_LEVELS.TRACE,
    handle: (entry) => capture.push(entry),
  }
  const config = resolveConfig({
    level,
    enabled: true,
    environment: 'test',
    appVersion: '0.0.0',
  })
  return new Logger(config, [transport])
}

describe('levels', () => {
  it('enables a level only when it meets the threshold', () => {
    expect(isLevelEnabled(LOG_LEVELS.INFO, LOG_LEVELS.WARN)).toBe(false)
    expect(isLevelEnabled(LOG_LEVELS.WARN, LOG_LEVELS.WARN)).toBe(true)
    expect(isLevelEnabled(LOG_LEVELS.ERROR, LOG_LEVELS.WARN)).toBe(true)
  })

  it('maps numbers back to names', () => {
    expect(levelNameOf(LOG_LEVELS.ERROR)).toBe('ERROR')
    expect(levelNameOf(LOG_LEVELS.INFO)).toBe('INFO')
  })
})

describe('sanitizer', () => {
  it('redacts credentials and PII by key', () => {
    const out = sanitizeContext({
      username: 'admin',
      password: 's3cret',
      accessToken: 'eyJhbGciOi.eyJzdWIiOjF9.signature',
      phone: '09120000000',
      userId: 42,
    })
    expect(out?.password).toBe('[REDACTED]')
    expect(out?.accessToken).toBe('[REDACTED]')
    expect(out?.phone).toBe('[REDACTED]')
    expect(out?.username).toBe('admin')
    expect(out?.userId).toBe(42)
  })

  it('masks JWTs and bearer tokens in strings', () => {
    const masked = maskInlineSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig')
    expect(masked).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\./)
    expect(masked).toContain('[REDACTED]')
  })

  it('defuses newline-based log injection', () => {
    const evil = 'good\n[ERROR] hacked'
    const out = sanitizeMessage(evil)
    expect(out).not.toContain('\n')
    expect(out).toContain('\\n')
  })

  it('cleans sensitive query params from URLs', () => {
    const url = sanitizeUrl('https://x.test/api?token=secret-jwt&page=2')
    expect(url).toContain('REDACTED') // value may be URL-encoded (%5BREDACTED%5D)
    expect(url).not.toContain('secret-jwt')
    expect(url).toContain('page=2')
  })

  it('survives circular references and huge arrays', () => {
    const a: Record<string, unknown> = { name: 'x' }
    a.self = a
    const out = sanitizeContext({ a, coords: new Array(1000).fill([1, 2]) })
    expect(out?.a).toHaveProperty('self')
    expect((out?.a as { self?: unknown })?.self).toBe('[Circular]')
    expect(String(out?.coords)).toContain('Array(')
  })
})

describe('errorToInfo', () => {
  it('extracts fields from an Error', () => {
    const info = errorToInfo(new TypeError('boom'))
    expect(info.name).toBe('TypeError')
    expect(info.message).toBe('boom')
    expect(info.stack).toContain('TypeError')
  })

  it('extracts status/url/method from axios-like errors without leaking payloads', () => {
    const info = errorToInfo({
      message: 'Request failed with status code 500',
      response: { status: 500, data: { password: 'x' } },
      config: { url: 'https://x.test/api?token=t0p', method: 'post' },
    })
    expect(info.status).toBe(500)
    expect(info.url).toContain('REDACTED')
    expect(info.message).not.toContain('t0p')
  })

  it('handles strings and unknown values', () => {
    expect(errorToInfo('network down').message).toBe('network down')
    expect(errorToInfo(undefined).name).toBe('UnknownError')
  })
})

describe('Logger pipeline', () => {
  it('writes entries that meet the level threshold', () => {
    const logs: LogEntry[] = []
    const logger = makeLogger(LOG_LEVELS.INFO, logs)
    logger.debug('noise')
    logger.info(EV.APP_BOOT, { source: 'test' })
    expect(logs).toHaveLength(1)
    expect(logs[0].event).toBe(EV.APP_BOOT)
    expect(logs[0].levelName).toBe('INFO')
    expect(logs[0].environment).toBe('test')
  })

  it('sanitizes context and normalizes errors before dispatch', () => {
    const logs: LogEntry[] = []
    const logger = makeLogger(LOG_LEVELS.INFO, logs)
    logger.error('api.request.failed', { url: '/api/x', password: 'hunter2' }, new Error('boom'))
    expect(logs[0].context?.password).toBe('[REDACTED]')
    expect(logs[0].error?.message).toBe('boom')
  })

  it('deduplicates identical error floods', () => {
    const logs: LogEntry[] = []
    const config = resolveConfig({
      level: LOG_LEVELS.INFO,
      enabled: true,
      environment: 'test',
      appVersion: '0.0.0',
      dedupeWindowMs: 60000,
      dedupeMaxPerWindow: 2,
    })
    const logger = new Logger(config, [
      { name: 'test', level: LOG_LEVELS.TRACE, handle: (e) => logs.push(e) },
    ])
    const boom = new Error('same thing')
    logger.error('map.layer.failed', {}, boom)
    logger.error('map.layer.failed', {}, boom)
    logger.error('map.layer.failed', {}, boom)
    expect(logs).toHaveLength(2)
  })

  it('never throws even when a transport does', () => {
    const logger = makeLogger(LOG_LEVELS.INFO, [])
    const broken: Transport = {
      name: 'broken',
      level: LOG_LEVELS.TRACE,
      handle: () => {
        throw new Error('bad transport')
      },
    }
    const config = resolveConfig({ level: LOG_LEVELS.INFO, enabled: true, environment: 'test', appVersion: '0.0.0' })
    const l2 = new Logger(config, [broken])
    expect(() => l2.info('app.initialized')).not.toThrow()
  })

  it('is a no-op when disabled', () => {
    const logs: LogEntry[] = []
    const config = resolveConfig({ enabled: false, level: LOG_LEVELS.INFO, environment: 'test', appVersion: '0.0.0' })
    const logger = new Logger(config, [{ name: 'test', level: LOG_LEVELS.TRACE, handle: (e) => logs.push(e) }])
    logger.warn('x', {})
    expect(logs).toHaveLength(0)
  })
})