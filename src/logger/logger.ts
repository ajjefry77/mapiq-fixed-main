import type { LogContext, LogEntry, LoggerConfig, Transport } from './types';
import { LOG_LEVELS, isLevelEnabled, levelNameOf, type LogLevelNumber } from './levels';
import { sanitizeContext, sanitizeMessage, errorToInfo, errorSignature } from './sanitizer';
import { formatMessage } from './formatter';
import { Deduplicator } from './dedup';
import { shouldSample } from './sampling';
import { getBrowserInfo, getCurrentRoute, getRequestScope, getSessionId } from './context';

/**
 * Central application logger.
 *
 * Pipeline per write:
 *   enabled? → level threshold? → context merge → enrich (ids/env/version)
 *   → sanitize → error normalize → deduplicate (errors) → sample (low volume)
 *   → transport dispatch (each transport is independent and failure-isolated)
 *
 * Every transport call is wrapped so a logging failure can never crash the app.
 */

export class Logger {
  private readonly dedup: Deduplicator;
  private readonly config: LoggerConfig;
  private readonly transports: Transport[];
  private readonly baseContext: LogContext;
  private suppressedCount = 0;

  constructor(config: LoggerConfig, transports: Transport[], baseContext: LogContext = {}) {
    this.config = config;
    this.transports = transports;
    this.baseContext = baseContext;
    this.dedup = new Deduplicator(config.dedupeWindowMs, config.dedupeMaxPerWindow);
  }

  /** Create a scoped child logger that carries permanent extra context. */
  child(extra: LogContext): Logger {
    return new Logger(this.config, this.transports, { ...this.baseContext, ...extra });
  }

  /** Merge extra context into this logger instance (global or child level). */
  setContext(extra: LogContext): void {
    Object.assign(this.baseContext, extra);
  }

  get level(): LogLevelNumber {
    return this.config.level;
  }

  setLevel(level: LogLevelNumber): void {
    this.config.level = level;
    for (const transport of this.transports) {
      transport.setLevel(level);
    }
  }

  get transportsCount(): number {
    return this.transports.length;
  }

  get suppressed(): number {
    return this.suppressedCount;
  }

  trace(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.TRACE, event, context);
  }

  debug(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.DEBUG, event, context);
  }

  info(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.INFO, event, context);
  }

  warn(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.WARN, event, context, error);
  }

  error(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.ERROR, event, context, error);
  }

  fatal(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.FATAL, event, context, error);
  }

  write(level: LogLevelNumber, event: string, context?: LogContext, error?: unknown): void {
    if (!this.config.enabled) return;
    if (!isLevelEnabled(level, this.config.level)) return;

    try {
      const entry = this.buildEntry(level, event, context, error);
      if (!entry) return;
      this.dispatch(entry);
    } catch {
      /* the logger itself must never throw */
    }
  }

  async flush(): Promise<void> {
    await Promise.allSettled(
      this.transports.map((t) => (typeof t.flush === 'function' ? t.flush() : Promise.resolve())),
    );
  }

  /** Total outstanding entries still waiting on remote/error transports. */
  pendingRemote(): number {
    let total = 0;
    for (const t of this.transports) {
      if (t.name === 'remote' || t.name === 'error') {
        const anyT = t as unknown as { pending?: () => number };
        if (typeof anyT.pending === 'function') total += anyT.pending();
      }
    }
    return total;
  }

  flushForPageHide(): void {
    for (const t of this.transports) {
      if (t.name === 'remote' || t.name === 'error') {
        const anyT = t as unknown as { flushForPageHide?: () => void };
        anyT.flushForPageHide?.();
      }
    }
  }

  dispose(): void {
    for (const t of this.transports) {
      if (typeof t.dispose === 'function') t.dispose();
    }
  }

  private buildEntry(
    level: LogLevelNumber,
    event: string,
    context?: LogContext,
    error?: unknown,
  ): LogEntry | null {
    const scope = getRequestScope();
    const browser = getBrowserInfo();

    const merged: LogContext = {
      ...this.baseContext,
      ...context,
    };

    const route = typeof merged.route === 'string' ? merged.route : getCurrentRoute();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: levelNameOf(level),
      event: sanitizeMessage(event),
      context: sanitizeContext(merged, {
        depth: this.config.maxContextDepth,
        maxEntries: this.config.maxContextEntries,
      }),
      requestId: scope.requestId,
      traceId: scope.traceId,
      sessionId: getSessionId(),
      environment: this.config.environment,
      appVersion: this.config.appVersion,
      browser: browser.browser,
      os: browser.os,
      route,
    };

    if (error !== undefined) {
      const info = errorToInfo(error);
      entry.error = info;
      if (!entry.requestId && info.url) {
        entry.requestId = info.url;
      }
    }

    const message = formatMessage(entry);
    entry.message = sanitizeMessage(message);
    if (entry.context && typeof entry.context.message === 'string') {
      delete entry.context.message;
    }

    // Duplicate-error protection (errors only — they are what floods).
    if (entry.error) {
      const signature = errorSignature(entry.error, event);
      if (!this.dedup.shouldLog(signature)) {
        this.suppressedCount++;
        return null;
      }
    }

    // Sampling only for low-volume-relevant traffic below WARN.
    if (level < LOG_LEVELS.WARN && this.config.sampleRate < 1) {
      if (!shouldSample(event, this.config.sampleRate, entry.requestId ?? entry.sessionId)) {
        return null;
      }
    }

    return entry;
  }

  private dispatch(entry: LogEntry): void {
    for (const transport of this.transports) {
      try {
        if (isLevelEnabled(entry.level, transport.level)) {
          transport.handle(entry);
        }
      } catch {
        /* one broken transport must not affect the others */
      }
    }
  }
}

/** Module-level registry so global handlers and interceptor helpers can reach the active logger. */
let activeLogger: Logger | null = null;

export function setActiveLogger(logger: Logger): void {
  activeLogger = logger;
}

export function getActiveLogger(): Logger | null {
  return activeLogger;
}