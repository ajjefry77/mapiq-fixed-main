import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogQueue, type QueueOptions } from '../src/logger/queue'
import type { LogEntry } from '../src/logger/types'

function makeEntry(event = 'test.event'): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 30,
    levelName: 'INFO',
    event,
    environment: 'test',
    appVersion: '0.0.0',
  }
}

function options(overrides: Partial<QueueOptions> = {}): QueueOptions {
  return {
    batchSize: 10,
    flushIntervalMs: 0,
    maxQueueSize: 200,
    maxRetries: 2,
    retryBaseDelayMs: 5,
    retryMaxDelayMs: 20,
    requestTimeoutMs: 1000,
    enabled: true,
    endpoint: 'https://logs.example.com/api/logs',
    ...overrides,
  }
}

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
}

describe('LogQueue', () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    send = vi.fn(async () => true)
    setOnline(true)
  })

  it('batches entries: ships batchSize logs per request', async () => {
    const queue = new LogQueue(options(), send)
    for (let i = 0; i < 25; i++) queue.push(makeEntry(`e${i}`))

    // Let the background/auto flush settle, then drain explicitly.
    for (let i = 0; i < 10 && queue.size > 0; i++) {
      await new Promise((r) => setTimeout(r, 0))
      await queue.flush()
    }

    expect(queue.size).toBe(0)
    const totalSent = send.mock.calls.reduce((sum, call) => sum + call[0].length, 0)
    expect(totalSent).toBe(25)
    for (const [batch] of send.mock.calls) {
      expect(batch.length).toBeLessThanOrEqual(10)
    }
  })

  it('respects the batch payload contract (levelName/event/context)', async () => {
    const queue = new LogQueue(options({ batchSize: 5 }), send)
    queue.push(makeEntry('api.request.failed'))
    await queue.flush()
    expect(send).toHaveBeenCalledTimes(1)
    const payload = send.mock.calls[0][0][0]
    expect(payload.event).toBe('api.request.failed')
    expect(payload.level).toBe('INFO')
  })

  it('keeps the queue and does not send while offline', async () => {
    const queue = new LogQueue(options(), send)
    queue.push(makeEntry())
    setOnline(false)
    const flushed = await queue.flush()
    expect(flushed).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(queue.size).toBe(1)

    setOnline(true)
    send.mockResolvedValueOnce(true)
    await queue.flush()
    expect(queue.size).toBe(0)
  })

  it('retries a failed batch with backoff and then gives up', async () => {
    const queue = new LogQueue(options({ maxRetries: 2, retryBaseDelayMs: 1 }), send)
    send.mockResolvedValue(false) // always fails

    queue.push(makeEntry())
    let result = await queue.flush()
    expect(result).toBe(false) // backoff, batch still queued
    result = await queue.flush()
    expect(result).toBe(false)
    result = await queue.flush() // third attempt: budget (2) exhausted → dropped
    expect(result).toBe(true)
    expect(queue.size).toBe(0)
    expect(send.mock.calls.length).toBe(3)
  })

  it('drops the oldest entry when the queue is full (bounded memory)', () => {
    const onDrop = vi.fn()
    const queue = new LogQueue(options({ maxQueueSize: 3 }), send)
    queue.onFull = onDrop

    queue.push(makeEntry('e1'))
    queue.push(makeEntry('e2'))
    queue.push(makeEntry('e3'))
    queue.push(makeEntry('e4'))
    queue.push(makeEntry('e5'))

    expect(queue.size).toBe(3)
    expect(onDrop).toHaveBeenCalledTimes(2)
    expect(onDrop.mock.calls[1][0].event).toBe('e2') // oldest survivor dropped before this push
  })
})