import { describe, it, expect, vi } from 'vitest'
import { Logger } from '../src/logger/logger'
import { resolveConfig } from '../src/logger/config'
import { LOG_LEVELS, LEVEL_NAMES } from '../src/logger/levels'
import { beginRequest, getRequestScope, endRequest, getSessionId } from '../src/logger/context'
import type { LogEntry, LogContext, Transport } from '../src/logger/types'

function mockTransport(level = LOG_LEVELS.TRACE) {
  const entries: LogEntry[] = []
  const transport: Transport = {
    name: 'mock',
    level,
    setLevel(l) {
      this.level = l
    },
    handle(e) {
      entries.push(e)
    },
  }
  return { transport, entries }
}

function baseConfig() {
  return resolveConfig({
    remoteEnabled: false,
    errorReportingEnabled: false,
    consoleEnabled: false,
    environment: 'test',
    sampleRate: 1,
    dedupeWindowMs: 1000,
    dedupeMaxPerWindow: 3,
  })
}

describe('Logger pipeline', () => {
  it('filters entries below the configured level', () => {
    const { transport, entries } = mockTransport()
    const logger = new Logger({ ...baseConfig(), level: LOG_LEVELS.WARN }, [transport])

    logger.debug('noise')
    logger.info('hello')
    logger.warn('ok')
    logger.error('bad')

    expect(entries.map((e) => e.event)).toEqual(['ok', 'bad'])
  })

  it('produces structured entries with environment + version + levelName', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [transport])

    logger.info('auth.login.success', { userId: '7' })

    expect(entries).toHaveLength(1)
    const entry = entries[0]
    expect(entry.levelName).toBe('INFO')
    expect(entry.environment).toBe('test')
    expect(entry.event).toBe('auth.login.success')
    expect(entry.appVersion).toBeTruthy()
    expect(entry.timestamp).toBeTruthy()
  })

  it('inherits request correlation ids from the request scope', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [transport])

    const scope = beginRequest()
    logger.info('api.request.success', { method: 'GET' })
    endRequest()

    expect(getRequestScope().requestId).toBeUndefined() // cleared after end
    const entry = entries[0]
    expect(entry.requestId).toBe(scope.requestId)
    expect(entry.traceId).toBe(scope.traceId)
  })

  it('merges child context into every entry', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [transport])
    const map = logger.child({ module: 'map', feature: 'measurement' })

    map.warn('map.layer.failed', { layerName: 'streets' })

    const entry = entries[0]
    expect((entry.context as LogContext).module).toBe('map')
    expect((entry.context as LogContext).feature).toBe('measurement')
    expect((entry.context as LogContext).layerName).toBe('streets')
  })

  it('sanitizes context before it reaches the transport', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [transport])

    logger.info('user.action.completed', { password: 'hunter2', userId: 5 })

    const ctx = entries[0].context as LogContext
    expect(ctx.password).toBe('[REDACTED]')
    expect(ctx.userId).toBe(5)
  })

  it('deduplicates repeated identical errors (log flooding guard)', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.ERROR)
    const logger = new Logger({ ...baseConfig(), level: LOG_LEVELS.ERROR }, [transport])

    for (let i = 0; i < 15; i++) {
      logger.error('map.layer.failed', { layerName: 'streets' }, new Error('tile 500'))
    }

    expect(entries).toHaveLength(3) // dedupeMaxPerWindow
    expect(logger.suppressed).toBe(12)
  })

  it('an entry with an error carries normalized error info', () => {
    const { transport, entries } = mockTransport(LOG_LEVELS.ERROR)
    const logger = new Logger({ ...baseConfig(), level: LOG_LEVELS.ERROR }, [transport])

    const boom = new TypeError('boom')
    logger.error('api.request.failed', { url: '/api/x' }, boom)

    expect(entries[0].error?.name).toBe('TypeError')
    expect(entries[0].error?.message).toBe('boom')
  })

  it('a throwing transport does not break the logger or the app', () => {
    const throwing: Transport = {
      name: 'broken',
      level: LOG_LEVELS.TRACE,
      setLevel() {},
      handle() {
        throw new Error('transport exploded')
      },
    }
    const good = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [throwing, good.transport])

    expect(() => logger.info('app.initialized')).not.toThrow()
    expect(good.entries).toHaveLength(1)
  })
})

describe('context helpers', () => {
  it('returns a stable session id', () => {
    expect(getSessionId()).toBe(getSessionId())
  })

  it('nests request scopes like a stack', () => {
    beginRequest()
    const outer = getRequestScope()
    beginRequest()
    const inner = getRequestScope()
    expect(outer.traceId).not.toBe(inner.traceId)
    endRequest()
    expect(getRequestScope().requestId).toBe(outer.requestId)
    endRequest()
    expect(getRequestScope().requestId).toBeUndefined()
  })
})

describe('level names map', () => {
  it('covers every numeric level', () => {
    const names = Object.values(LEVEL_NAMES)
    expect(names).toContain('TRACE')
    expect(names).toContain('FATAL')
  })
})

describe('logger is never synchronous-throwing', () => {
  it('swallows invalid context input', () => {
    const { transport } = mockTransport(LOG_LEVELS.TRACE)
    const logger = new Logger({ ...baseConfig() }, [transport])
    expect(() =>
      logger.info('user.action.started', { strange: Symbol('x') } as unknown as LogContext),
    ).not.toThrow()
  })

  it('keeps working when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto?.randomUUID
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    const { transport, entries } = mockTransport(LOG_LEVELS.INFO)
    const logger = new Logger({ ...baseConfig(), level: LOG_LEVELS.INFO }, [transport])
    logger.info('app.initialized')
    expect(entries).toHaveLength(1)
    if (original) {
      Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: original }, configurable: true })
    }
  })
})