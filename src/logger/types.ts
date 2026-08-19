import type { LogLevelName, LogLevelNumber } from './levels';

export type { LogLevelName, LogLevelNumber };

/** Arbitrary key/value context attached to a log entry. */
export type LogContext = Record<string, unknown>;

/** Normalized, safe description of an error. No response payloads are kept. */
export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  status?: number;
  cause?: string;
  url?: string;
  method?: string;
}

/**
 * A fully-resolved log entry. This is the exact shape that every transport
 * receives, so Console / Remote / Error transports all speak one dialect.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevelNumber;
  levelName: LogLevelName;
  /** Stable dot-separated event name, e.g. "api.request.failed". */
  event: string;
  message?: string;
  context?: LogContext;
  error?: ErrorInfo;
  requestId?: string;
  traceId?: string;
  sessionId?: string;
  environment: string;
  appVersion: string;
  browser?: string;
  os?: string;
  route?: string;
}

export interface Transport {
  readonly name: string;
  level: LogLevelNumber;
  setLevel(level: LogLevelNumber): void;
  handle(entry: LogEntry): void;
  flush?(): Promise<void>;
  dispose?(): void;
}

export interface LoggerConfig {
  /** Minimum level that will actually be written (env-specific). */
  level: LogLevelNumber;
  /** Master switch. When false the logger is a no-op. */
  enabled: boolean;
  /** Send INFO-level+ operational logs to the remote endpoint. */
  remoteEnabled: boolean;
  /** Send ERROR/FATAL entries to the error tracking endpoint. */
  errorReportingEnabled: boolean;
  /**
   * Probability in [0..1] for high-volume events. Applied only to levels below
   * WARN. 1 = log everything, 0 = log nothing.
   */
  sampleRate: number;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  /** Time window (ms) used by the deduplicator. */
  dedupeWindowMs: number;
  /** Max occurrences of the same error signature per window. */
  dedupeMaxPerWindow: number;
  /** Max object depth the sanitizer will traverse. */
  maxContextDepth: number;
  /** Max entries the sanitizer will visit per object. */
  maxContextEntries: number;
  remoteEndpoint?: string;
  environment: string;
  appVersion: string;
  consoleEnabled: boolean;
  offlineQueueEnabled: boolean;
  requestTimeoutMs: number;
}