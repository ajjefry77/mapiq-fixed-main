import { Logger, setActiveLogger } from './logger';
import { resolveConfig } from './config';
import { createTransports } from './transports';
import { installGlobalErrorHandlers } from './globalHandlers';
import { EV } from './events';
import { beginRequest, endRequest, getRequestScope } from './context';
import { LOG_LEVELS } from './levels';
import { sanitizeContext, sanitizeUrl, sanitizeMessage } from './sanitizer';
import type { LogContext, LoggerConfig } from './types';

/**
 * Public logging API.
 *
 * Usage:
 *   import { logger, EV } from '@/logger'
 *
 *   logger.info(EV.API_REQUEST_SUCCESS, { endpoint, status, durationMs })
 *   logger.error(EV.API_REQUEST_FAILED, { endpoint }, err)
 *
 *   const log = logger.child({ module: 'map', feature: 'measurement' })
 *   log.warn('map.layer.failed', { layerName })
 *
 * Singleton bootstrap:
 *   import { initLogging, installGlobalErrorHandlers } from '@/logger'
 *   initLogging()            // reads VITE_LOG_* env
 *   installGlobalErrorHandlers(app)
 */

let loggerInstance: Logger | null = null;

/** Initialize (or reinitialize) the singleton logger. Idempotent first call. */
export function initLogging(overrides?: Partial<LoggerConfig>): Logger {
  const config = resolveConfig(overrides);
  const transports = createTransports(config);
  const instance = new Logger(config, transports);
  loggerInstance = instance;
  setActiveLogger(instance);
  return instance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    return initLogging();
  }
  return loggerInstance;
}

/**
 * The application-wide singleton. Import this directly in views/components.
 *
 * Implemented as a proxy so re-initialization (initLogging with app version
 * overrides) is always reflected by the same import surface.
 */
const proxyHandler: ProxyHandler<object> = {
  get(_target, prop: string | symbol) {
    const instance = getLogger() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    if (typeof value === 'function') return value.bind(instance);
    return value;
  },
};

export const logger: Logger = new Proxy<Logger>(
  {} as Logger,
  proxyHandler as ProxyHandler<Logger>,
);

export { EV, LOG_LEVELS, beginRequest, endRequest, getRequestScope, installGlobalErrorHandlers };

export { setupApiLogging } from './apiLogger';

export {
  classifyDuration,
  withPerf,
  API_THRESHOLDS,
  MAP_THRESHOLDS,
  FILE_THRESHOLDS,
  SAVE_THRESHOLDS,
} from './perf';

export {
  Logger,
  resolveConfig,
  createTransports,
  sanitizeContext,
  sanitizeUrl,
  sanitizeMessage,
};

export type { LogContext, LoggerConfig };
export type { LogEntry, ErrorInfo, Transport } from './types';
export type { LogLevelName, LogLevelNumber } from './levels';

/** Set global (app-wide) context once at boot, e.g. { appVersion } overrides. */
export function setGlobalContext(context: LogContext): void {
  getLogger().setContext(context);
}

/** Convenience for flushing everything (used on pagehide / beforeunload). */
export async function flushLogger(): Promise<void> {
  await getLogger().flush();
}

/** Number of entries still queued for remote/error shipping. */
export function pendingRemoteLogs(): number {
  return getLogger().pendingRemote();
}
