import { LOG_LEVELS, type LogLevelNumber } from './levels';
import type { LoggerConfig } from './types';

/**
 * Configuration is 100% environment-driven and never hard-coded per file.
 *
 * Env vars supported (all optional):
 *   VITE_APP_ENV                     'development' | 'test' | 'staging' | 'production'
 *   VITE_APP_VERSION                 e.g. '1.4.2'
 *   VITE_LOG_ENABLED                 master switch            (default true)
 *   VITE_LOG_CONSOLE_ENABLED         console transport        (default true)
 *   VITE_LOG_LEVEL                   trace|debug|info|warn|error|fatal
 *   VITE_LOG_ENDPOINT                remote ingest URL        (disables remote if empty)
 *   VITE_REMOTE_LOGGING_ENABLED      remote transport         (default: has endpoint)
 *   VITE_ERROR_REPORTING_ENABLED     error transport          (default: has endpoint)
 *   VITE_LOG_SAMPLE_RATE             0..1                     (default 1)
 *   VITE_LOG_BATCH_SIZE              default 10
 *   VITE_LOG_FLUSH_INTERVAL          ms, default 5000
 *   VITE_LOG_MAX_QUEUE_SIZE          default 200
 *   VITE_LOG_MAX_RETRIES             default 3
 *   VITE_LOG_RETRY_BASE_DELAY        ms, default 500
 *   VITE_LOG_RETRY_MAX_DELAY         ms, default 8000
 *   VITE_LOG_DEDUPE_WINDOW           ms, default 60000
 *   VITE_LOG_DEDUPE_MAX              default 10
 *   VITE_LOG_MAX_DEPTH               default 6
 *   VITE_LOG_MAX_ENTRIES             default 200
 *   VITE_LOG_OFFLINE_QUEUE           default true
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let mode: string;
try {
  mode = (import.meta as any).env?.MODE || 'development';
} catch {
  mode = 'development';
}

function readEnv(name: string): unknown {
  try {
    return (import.meta as any).env ? (import.meta as any).env[name] : undefined;
  } catch {
    return undefined;
  }
}

function asNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

const LEVEL_ALIASES: Record<string, LogLevelNumber> = {
  trace: LOG_LEVELS.TRACE,
  debug: LOG_LEVELS.DEBUG,
  info: LOG_LEVELS.INFO,
  warn: LOG_LEVELS.WARN,
  warning: LOG_LEVELS.WARN,
  error: LOG_LEVELS.ERROR,
  fatal: LOG_LEVELS.FATAL,
};

function envLevel(name: string, fallback: LogLevelNumber): LogLevelNumber {
  const raw = readEnv(name);
  if (raw === undefined || raw === null || raw === '') return fallback;
  return LEVEL_ALIASES[String(raw).toLowerCase()] ?? fallback;
}

function defaultLevelForMode(env: string): LogLevelNumber {
  switch (env) {
    case 'production':
      return LOG_LEVELS.WARN;
    case 'staging':
      return LOG_LEVELS.INFO;
    case 'test':
      return LOG_LEVELS.INFO;
    default:
      return LOG_LEVELS.DEBUG;
  }
}

/** The minimum level a given environment should ship to ops tooling. */
export function naturalLevelForEnvironment(env: string): LogLevelNumber {
  return defaultLevelForMode(env);
}

export function getDefaultConfig(): LoggerConfig {
  const environment = String(readEnv('VITE_APP_ENV') || mode);
  const remoteEndpoint = readEnv('VITE_LOG_ENDPOINT') as string | undefined;
  const hasEndpoint = Boolean(remoteEndpoint && String(remoteEndpoint).trim());

  return {
    level: envLevel('VITE_LOG_LEVEL', defaultLevelForMode(environment)),
    enabled: asBoolean(readEnv('VITE_LOG_ENABLED'), true),
    remoteEnabled: asBoolean(readEnv('VITE_REMOTE_LOGGING_ENABLED'), hasEndpoint),
    errorReportingEnabled: asBoolean(readEnv('VITE_ERROR_REPORTING_ENABLED'), hasEndpoint),
    sampleRate: asNumber(readEnv('VITE_LOG_SAMPLE_RATE'), 1),
    batchSize: asNumber(readEnv('VITE_LOG_BATCH_SIZE'), 10),
    flushIntervalMs: asNumber(readEnv('VITE_LOG_FLUSH_INTERVAL'), 5000),
    maxQueueSize: asNumber(readEnv('VITE_LOG_MAX_QUEUE_SIZE'), 200),
    maxRetries: asNumber(readEnv('VITE_LOG_MAX_RETRIES'), 3),
    retryBaseDelayMs: asNumber(readEnv('VITE_LOG_RETRY_BASE_DELAY'), 500),
    retryMaxDelayMs: asNumber(readEnv('VITE_LOG_RETRY_MAX_DELAY'), 8000),
    dedupeWindowMs: asNumber(readEnv('VITE_LOG_DEDUPE_WINDOW'), 60000),
    dedupeMaxPerWindow: asNumber(readEnv('VITE_LOG_DEDUPE_MAX'), 10),
    maxContextDepth: asNumber(readEnv('VITE_LOG_MAX_DEPTH'), 6),
    maxContextEntries: asNumber(readEnv('VITE_LOG_MAX_ENTRIES'), 200),
    remoteEndpoint: hasEndpoint ? String(remoteEndpoint).trim() : undefined,
    environment,
    appVersion: String(readEnv('VITE_APP_VERSION') || '0.0.0'),
    consoleEnabled: asBoolean(readEnv('VITE_LOG_CONSOLE_ENABLED'), true),
    offlineQueueEnabled: asBoolean(readEnv('VITE_LOG_OFFLINE_QUEUE'), true),
    requestTimeoutMs: asNumber(readEnv('VITE_LOG_REQUEST_TIMEOUT'), 2000),
  };
}

export function resolveConfig(overrides?: Partial<LoggerConfig>): LoggerConfig {
  const base = getDefaultConfig();
  return overrides ? { ...base, ...overrides } : base;
}