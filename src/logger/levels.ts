/**
 * Log Levels
 *
 * Semantics (RFC 5424 style, operates on syslog's spirit but kept simple):
 *
 *   TRACE (10) — Deepest diagnostic detail. Only for local debugging of a
 *                specific code path. Must never be enabled in production.
 *   DEBUG (20) — Development/diagnostic info. Data that helps a developer
 *                understand what the code is doing (e.g. shape metadata counts).
 *   INFO  (30) — Important system events: login, logout, map init, layer load,
 *                report generation. Operationally meaningful, low volume.
 *   WARN  (40) — Abnormal condition that did NOT break the current operation:
 *                rate limiting, degraded fallback, deprecated API usage.
 *   ERROR (50) — A failure that disturbed an operation (a request, a save,
 *                a layer load). Needs attention, is searchable, grouped.
 *   FATAL (60) — The system or a critical subsystem is unusable. e.g. the map
 *                failed to create its viewer, the app failed to boot.
 *
 * Levels are numeric so that `level >= threshold` is a cheap check.
 */

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const;

export type LogLevelNumber = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
export type LogLevelName = keyof typeof LOG_LEVELS;

export const LEVEL_NAMES: Record<LogLevelNumber, LogLevelName> = {
  [LOG_LEVELS.TRACE]: 'TRACE',
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.FATAL]: 'FATAL',
};

export const LEVEL_META: Record<LogLevelNumber, { label: string; color: string }> = {
  [LOG_LEVELS.TRACE]: { label: 'TRACE', color: '#9e9e9e' },
  [LOG_LEVELS.DEBUG]: { label: 'DEBUG', color: '#29b6f6' },
  [LOG_LEVELS.INFO]: { label: 'INFO', color: '#66bb6a' },
  [LOG_LEVELS.WARN]: { label: 'WARN', color: '#ffca28' },
  [LOG_LEVELS.ERROR]: { label: 'ERROR', color: '#ef5350' },
  [LOG_LEVELS.FATAL]: { label: 'FATAL', color: '#d32f2f' },
};

export function isLevelEnabled(level: LogLevelNumber, threshold: LogLevelNumber): boolean {
  return level >= threshold;
}

export function levelNameOf(level: LogLevelNumber): LogLevelName {
  return LEVEL_NAMES[level] ?? 'INFO';
}