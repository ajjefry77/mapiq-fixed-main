import type { LogEntry, LoggerConfig, Transport } from './types';
import { LOG_LEVELS, isLevelEnabled, type LogLevelNumber } from './levels';
import { formatForConsole, toJSON } from './formatter';
import { LogQueue } from './queue';
import { sanitizeUrl } from './sanitizer';

/**
 * Transport layer — swappable sinks for LogEntry.
 *
 *   ConsoleTransport  — human-readable output for developers (browser devtools).
 *   RemoteTransport   — batched, offline-safe, retried push to an ingest API.
 *   ErrorTransport    — dedicated ERROR/FATAL pipeline for error tracking; keeps
 *                       a small, high-priority queue separate from INFO traffic
 *                       so error volume never has to fight regular logs.
 *
 * A failed transport NEVER throws: `handle()` is always wrapped so a broken
 * logging path cannot take the application down (rule: logging must not crash).
 */

const CONSOLE_METHOD: Record<number, 'log' | 'info' | 'warn' | 'error'> = {
  [LOG_LEVELS.TRACE]: 'log',
  [LOG_LEVELS.DEBUG]: 'log',
  [LOG_LEVELS.INFO]: 'info',
  [LOG_LEVELS.WARN]: 'warn',
  [LOG_LEVELS.ERROR]: 'error',
  [LOG_LEVELS.FATAL]: 'error',
};

// WARN/ERROR/FATAL keep their native browser colors/icons; TRACE/DEBUG get a
// muted tint so the devtools console stays scannable without fighting defaults.
const CONSOLE_STYLE: Record<number, string> = {
  [LOG_LEVELS.TRACE]: 'color:#9e9e9e;',
  [LOG_LEVELS.DEBUG]: 'color:#0288d1;',
};

export class ConsoleTransport implements Transport {
  readonly name = 'console';
  level: LogLevelNumber;

  constructor(level: LogLevelNumber, private readonly enabled = true) {
    this.level = level;
  }

  setLevel(level: LogLevelNumber): void {
    this.level = level;
  }

  handle(entry: LogEntry): void {
    if (!this.enabled || !isLevelEnabled(entry.level, this.level)) return;
    try {
      const method = CONSOLE_METHOD[entry.level] ?? 'log';
      const line = formatForConsole(entry);
      const detail = JSON.stringify(toJSON(entry), null, 2);
      const style = CONSOLE_STYLE[entry.level];
      if (style) {
        // eslint-disable-next-line no-console
        console[method](`%c${line}`, style, detail);
      } else {
        // eslint-disable-next-line no-console
        console[method](line, detail);
      }
    } catch {
      /* never let the console transport break the app */
    }
  }
}

function buildSend(
  endpoint: string,
): (batch: Record<string, unknown>[]) => Promise<boolean> {
  return async (batch) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        keepalive: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  };
}

export class RemoteTransport implements Transport {
  readonly name = 'remote';
  level: LogLevelNumber;
  private queue: LogQueue | null;

  constructor(config: LoggerConfig, level: LogLevelNumber) {
    this.level = level;
    const endpoint = sanitizeUrl(config.remoteEndpoint);
    if (config.remoteEnabled && endpoint) {
      this.queue = new LogQueue(
        {
          batchSize: config.batchSize,
          flushIntervalMs: config.flushIntervalMs,
          maxQueueSize: config.maxQueueSize,
          maxRetries: config.maxRetries,
          retryBaseDelayMs: config.retryBaseDelayMs,
          retryMaxDelayMs: config.retryMaxDelayMs,
          requestTimeoutMs: config.requestTimeoutMs,
          enabled: config.offlineQueueEnabled,
          endpoint,
        },
        buildSend(endpoint),
      );
      this.queue.onFull = (dropped) => {
        try {
          // eslint-disable-next-line no-console
          console.warn('[logger] dropped oldest queued log to protect memory', dropped.event);
        } catch {
          /* ignore */
        }
      };
      this.queue.start();
    } else {
      this.queue = null;
    }
  }

  setLevel(level: LogLevelNumber): void {
    this.level = level;
  }

  handle(entry: LogEntry): void {
    if (!this.queue) return;
    if (!isLevelEnabled(entry.level, this.level)) return;
    try {
      this.queue.push(entry);
    } catch {
      /* never let the remote transport break the app */
    }
  }

  async flush(): Promise<void> {
    try {
      if (this.queue) await this.queue.flush();
    } catch {
      /* ignore */
    }
  }

  /** Number of entries still waiting to be shipped. */
  pending(): number {
    return this.queue?.size ?? 0;
  }

  flushForPageHide(): void {
    try {
      this.queue?.flushForPageHide();
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    try {
      this.queue?.dispose();
      this.queue = null;
    } catch {
      /* ignore */
    }
  }
}

export class ErrorTransport implements Transport {
  readonly name = 'error';
  level: LogLevelNumber;
  private queue: LogQueue | null;

  constructor(config: LoggerConfig, level: LogLevelNumber) {
    this.level = level;
    const endpoint = sanitizeUrl(config.remoteEndpoint);
    if (config.errorReportingEnabled && endpoint) {
      this.queue = new LogQueue(
        {
          batchSize: Math.max(1, Math.min(config.batchSize, 5)),
          flushIntervalMs: Math.min(config.flushIntervalMs, 1000),
          maxQueueSize: Math.max(10, Math.round(config.maxQueueSize / 4)),
          maxRetries: config.maxRetries,
          retryBaseDelayMs: config.retryBaseDelayMs,
          retryMaxDelayMs: config.retryMaxDelayMs,
          requestTimeoutMs: config.requestTimeoutMs,
          enabled: true,
          endpoint,
        },
        buildSend(endpoint),
      );
      this.queue.start();
    } else {
      this.queue = null;
    }
  }

  setLevel(level: LogLevelNumber): void {
    this.level = level;
  }

  handle(entry: LogEntry): void {
    if (!this.queue) return;
    if (!isLevelEnabled(entry.level, this.level)) return;
    try {
      // Try immediately for errors — they are worth the extra request.
      this.queue.push(entry);
      void this.queue.flush();
    } catch {
      /* ignore */
    }
  }

  async flush(): Promise<void> {
    try {
      if (this.queue) await this.queue.flush();
    } catch {
      /* ignore */
    }
  }

  /** Number of ERROR/FATAL entries still waiting to be shipped. */
  pending(): number {
    return this.queue?.size ?? 0;
  }

  flushForPageHide(): void {
    try {
      this.queue?.flushForPageHide();
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    try {
      this.queue?.dispose();
      this.queue = null;
    } catch {
      /* ignore */
    }
  }
}

export function createTransports(config: LoggerConfig): Transport[] {
  const transports: Transport[] = [];
  if (config.consoleEnabled) {
    transports.push(new ConsoleTransport(config.level, true));
  }
  if (config.remoteEnabled && config.remoteEndpoint) {
    transports.push(new RemoteTransport(config, config.level));
  }
  if (config.errorReportingEnabled && config.remoteEndpoint) {
    transports.push(new ErrorTransport(config, LOG_LEVELS.ERROR));
  }
  return transports;
}