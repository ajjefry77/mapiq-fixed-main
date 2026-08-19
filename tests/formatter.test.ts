import { describe, it, expect } from 'vitest'
import { formatForConsole, formatMessage, toJSON } from '../src/logger/formatter'
import { LOG_LEVELS } from '../src/logger/levels'
import type { LogEntry } from '../src/logger/types'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2026-08-19T09:46:15.210Z',
    level: LOG_LEVELS.INFO,
    levelName: 'INFO',
    event: 'api.request.failed',
    message: 'Request failed with status code 500',
    context: { method: 'get', url: 'http://localhost:3000/api/login', status: 500, durationMs: 312, component: 'Login.vue' },
    requestId: 'req-123',
    traceId: 'trace-abc',
    sessionId: 'sess-long-id-xyz',
    environment: 'test',
    appVersion: '1.2.3',
    route: '/login',
    ...overrides,
  }
}

describe('formatForConsole', () => {
  it('renders a scannable line with local time, level, event and message', () => {
    const line = formatForConsole(entry())
    expect(line).toContain('INFO')
    expect(line).toContain('api.request.failed')
    expect(line).toContain('Request failed with status code 500')
    expect(line).toContain('GET')
    expect(line).toContain('api/login')
    expect(line).toContain('status=500')
    expect(line).toContain('312ms')
    expect(line).toContain('component=Login.vue')
    expect(line).toContain('req=req-123')
    expect(line).toContain('trace=trace-abc')
    expect(line).toContain('session=sess-lon') // truncated to 8 chars
  })

  it('shows a local (not UTC) wall-clock time', () => {
    const line = formatForConsole(entry())
    // 09:46:15.210Z is the UTC stamp; the local rendering must not be the raw ISO string.
    expect(line).not.toContain('T09:46:15')
  })
})

describe('formatMessage', () => {
  it('prefers the resolved message over re-deriving from context', () => {
    const e = entry({ message: 'custom message', context: { message: 'stale context message' } })
    expect(formatMessage(e)).toBe('custom message')
  })

  it('falls back to the event when no message exists', () => {
    expect(formatMessage(entry({ message: undefined, context: {} }))).toBe('api.request.failed')
  })
})

describe('toJSON', () => {
  it('keeps the resolved message and always carries ids/environment/version', () => {
    const json = toJSON(entry())
    expect(json.message).toBe('Request failed with status code 500')
    expect(json.level).toBe('INFO')
    expect(json.requestId).toBe('req-123')
    expect(json.traceId).toBe('trace-abc')
    expect(json.sessionId).toBe('sess-long-id-xyz')
    expect(json.environment).toBe('test')
    expect(json.appVersion).toBe('1.2.3')
    expect(json.route).toBe('/login')
  })

  it('surfaces error metadata when present', () => {
    const json = toJSON(entry({ error: { name: 'Error', message: 'boom', status: 500 } }))
    expect(json.error).toEqual({ name: 'Error', message: 'boom', status: 500 })
  })
})