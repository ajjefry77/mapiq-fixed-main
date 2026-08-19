import type { LogEntry } from './types';

/**
 * Offline-safe, bounded, batched queue used by remote transports.
 *
 * - Batches log entries so 1 network request carries N logs (batchSize).
 * - Bounded (maxQueueSize); oldest entries are dropped first to protect memory.
 * - Retries with exponential backoff (maxRetries) and never blocks the app:
 *   all sends fire in the background and failures are swallowed.
 * - If the browser is offline the queue simply stays queued until back online.
 */

export interface QueueOptions {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  requestTimeoutMs: number;
  enabled: boolean;
  endpoint: string;
}

type BatchSend = (batch: Record<string, unknown>[]) => Promise<boolean>;

interface QueueItem {
  entry: LogEntry;
  retries: number;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export class LogQueue {
  private queue: QueueItem[] = [];
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  private onFullCallback: (dropped: LogEntry) => void = () => {};

  constructor(
    private readonly options: QueueOptions,
    private readonly send: BatchSend,
  ) {}

  set onFull(cb: (dropped: LogEntry) => void) {
    this.onFullCallback = cb;
  }

  get size(): number {
    return this.queue.length;
  }

  start(): void {
    if (this.timer || !this.options.flushIntervalMs) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.options.flushIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  push(entry: LogEntry): void {
    if (!this.options.enabled) return;
    if (this.queue.length >= this.options.maxQueueSize) {
      const dropped = this.queue.shift();
      if (dropped) this.onFullCallback(dropped.entry);
    }
    this.queue.push({ entry, retries: 0 });
    if (this.queue.length >= this.options.batchSize) {
      void this.flush();
    }
  }

  /** Ships queued items to the wire. Returns true when the queue is empty. */
  async flush(): Promise<boolean> {
    if (this.disposed || this.flushing || this.queue.length === 0) return true;
    if (!isOnline()) return false;

    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        // Respect batch size: cut off at the boundary.
        const batch = this.queue.slice(0, this.options.batchSize);
        const payload = batch.map((item) => itemToJson(item.entry));

        let ok = false;
        try {
          ok = await withTimeout(this.send(payload), this.options.requestTimeoutMs);
        } catch {
          ok = false;
        }

        if (ok) {
          this.queue.splice(0, batch.length);
          continue;
        }

        // Failure: retry with exponential backoff, keeping the batch queued
        // for the next flush unless the retry budget is exhausted.
        if (batch[0].retries < this.options.maxRetries) {
          for (const item of batch) {
            item.retries += 1;
          }
          const delay = Math.min(
            this.options.retryBaseDelayMs * 2 ** Math.max(0, batch[0].retries - 1),
            this.options.retryMaxDelayMs,
          );
          await sleep(delay);
          return false; // backoff — give other producers a chance to catch up
        }
        this.queue.splice(0, batch.length);
      }
      return true;
    } finally {
      this.flushing = false;
    }
  }

  /** Try to flush outstanding items right before the page goes away. */
  flushForPageHide(): void {
    if (this.queue.length === 0 || !this.options.endpoint) return;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const payload = this.takeAll().map(itemToJson);
      try {
        navigator.sendBeacon(
          this.options.endpoint,
          new Blob([JSON.stringify(payload)], { type: 'application/json' }),
        );
      } catch {
        /* beacon failures are fine; nothing to retry on pagehide */
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.queue = [];
  }

  private takeAll(): LogEntry[] {
    const out = this.queue.map((i) => i.entry);
    this.queue = [];
    return out;
  }
}

function isOnline(): boolean {
  try {
    return navigator.onLine;
  } catch {
    return true;
  }
}

function withTimeout(promise: Promise<boolean>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

function itemToJson(entry: LogEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.levelName,
    event: entry.event,
    message: entry.message,
    context: entry.context,
    environment: entry.environment,
    appVersion: entry.appVersion,
  };
  if (entry.requestId) base.requestId = entry.requestId;
  if (entry.traceId) base.traceId = entry.traceId;
  if (entry.sessionId) base.sessionId = entry.sessionId;
  if (entry.browser) base.browser = entry.browser;
  if (entry.os) base.os = entry.os;
  if (entry.route) base.route = entry.route;
  if (entry.error) base.error = entry.error;
  return base;
}