import { describe, it, expect } from 'vitest'
import {
  errorToInfo,
  errorSignature,
  maskInlineSecrets,
  sanitizeContext,
  sanitizeMessage,
  sanitizeUrl,
  stripControlChars,
} from '../src/logger/sanitizer'

describe('sanitizer: sensitive keys', () => {
  it('redacts credentials and PII', () => {
    const out = sanitizeContext({
      username: 'admin',
      password: 's3cret',
      accessToken: 'eyJhbGciOi.eyJzdWIiOjF9.signature',
      'api-key': 'abc-123',
      cookie: 'session=xyz',
      phone: '09120000000',
      userId: 42,
    })
    expect(out?.password).toBe('[REDACTED]')
    expect(out?.accessToken).toBe('[REDACTED]')
    expect(out?.['api-key']).toBe('[REDACTED]')
    expect(out?.cookie).toBe('[REDACTED]')
    expect(out?.phone).toBe('[REDACTED]')
    expect(out?.username).toBe('admin')
    expect(out?.userId).toBe(42)
  })

  it('masks inline JWT and bearer tokens in strings', () => {
    expect(maskInlineSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.x12deadbeef')).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\./)
    expect(maskInlineSecrets('token=abc123def456ghi789')).toContain('[REDACTED]')
  })

  it('does not blow up on circular references', () => {
    const a: Record<string, unknown> = { name: 'x' }
    const b: Record<string, unknown> = { ref: a }
    a.self = a
    a.child = b
    const out = sanitizeContext(a)
    expect(typeof out).toBe('object')
  })

  it('collapses huge arrays to metadata (GIS geometry protection)', () => {
    const big = new Array(1000).fill(0).map(() => [1, 2, 3, 4, 1, 2, 3, 4])
    const out = sanitizeContext({ coords: big })
    expect(Array.isArray(out?.coords)).toBe(false) // collapsed to metadata
    expect(out?.coords).toHaveProperty('_count', 1000)
  })
})

describe('sanitizer: log injection', () => {
  it('defuses control characters', () => {
    const evil = 'good\n\u0000\u001bmessage\u0007'
    const out = stripControlChars(evil)
    expect(out).not.toContain('\u0000')
    expect(out).not.toContain('\u0007')
    expect(out).toContain('\\u001b')
  })

  it('sanitizes a message with embedded fake log lines', () => {
    const msg = sanitizeMessage('user said: \n[ERROR] hacked\n{"password":"x"}')
    expect(msg).toContain('user said:')
    expect(msg).not.toContain('\n') // single-line guaranteed
    expect(msg).not.toContain('hacked\n') // injection framing neutralized
    expect(msg).toContain('\\n') // original newlines survive as escaped text
  })
})

describe('sanitizer: urls', () => {
  it('redacts sensitive query parameters', () => {
    const url = sanitizeUrl('/map?token=eyJhbGciOiJIUzI1NiJ9.payload.sig&page=2')
    expect(url).toContain('REDACTED') // value may be URL-encoded ([REDACTED] -> %5BREDACTED%5D)
    expect(url).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(url).toContain('page=2')
  })
})

describe('errorToInfo', () => {
  it('extracts name/message/stack from an Error', () => {
    const info = errorToInfo(new TypeError('boom'))
    expect(info.name).toBe('TypeError')
    expect(info.message).toBe('boom')
    expect(info.stack).toContain('TypeError')
  })

  it('extracts status/url/method from axios-like objects but never the payload', () => {
    const like = {
      message: 'Request failed with status code 500',
      response: { status: 500, data: { token: 'super-secret', password: 'x' } },
      config: { url: '/api/login?token=abc123', method: 'post' },
    }
    const info = errorToInfo(like)
    expect(info.status).toBe(500)
    expect(info.method).toBe('POST')
    expect(info.url).toContain('REDACTED')
    expect(info.message).not.toContain('super-secret')
  })

  it('handles non-Error rejections and strings', () => {
    expect(errorToInfo('network down').name).toBeTruthy()
    expect(errorToInfo({ reason: 'nope' }).message).toBe('nope')
    expect(errorToInfo(undefined).name).toBe('UnknownError')
  })
})

describe('errorSignature', () => {
  it('is stable for the same error+event and distinct for different events', () => {
    const a = errorToInfo(new Error('cannot read properties of undefined'))
    const s1 = errorSignature(a, 'map.layer.failed')
    const s2 = errorSignature(a, 'map.layer.failed')
    const s3 = errorSignature(a, 'api.request.failed')
    expect(s1).toBe(s2)
    expect(s1).not.toBe(s3)
  })
})