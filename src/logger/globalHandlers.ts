import type { App } from 'vue';
import { getActiveLogger } from './logger';
import { EV } from './events';
import { sanitizeMessage, errorToInfo } from './sanitizer';

/**
 * Global error handling.
 *
 * Covers every class of uncaught failure in the browser:
 *   - window error events (syntax/runtime errors, asset load failures)
 *   - unhandled promise rejections
 *   - Vue errorHandler (errors thrown inside components, renderers, watchers)
 *   - Vue warnHandler (dev-only warnings, throttled)
 *   - Vite dynamic-import / chunk-loading failures
 *
 * All of them funnel into the central logger, so the app gets a single,
 * searchable stream of runtime failures instead of silent crashes.
 *
 * The handlers are installed once and are idempotent.
 */

interface GlobalHandlerOptions {
  /** When true, Vue warnHandler is wired (dev convenience). Default: dev. */
  captureWarnings?: boolean;
}

let installed = false;

export function installGlobalErrorHandlers(
  app?: App<unknown> | null,
  options: GlobalHandlerOptions = {},
): () => void {
  if (installed) return () => {};

  const getLogger = getActiveLogger;
  const captureWarnings = options.captureWarnings ?? !isProduction();

  function onWindowError(event: ErrorEvent): void {
    const logger = getLogger();
    if (!logger) return;
    const error = event.error ?? new Error(event.message || 'Unknown window error');
    logger.error(EV.APP_RUNTIME_ERROR, {
      type: 'window.error',
      message: sanitizeMessage(event.message || ''),
      filename: sanitizeMessage(event.filename || ''),
      lineno: event.lineno,
      colno: event.colno,
    }, error);
  }

  function onUnhandledRejection(event: PromiseRejectionEvent): void {
    const logger = getLogger();
    if (!logger) return;
    const reason = event.reason;
    logger.error(EV.APP_PROMISE_REJECTED, {
      type: 'unhandledrejection',
      message: reason instanceof Error ? undefined : sanitizeMessage(String(reason)),
    }, reason);
  }

  function onVueError(err: unknown, instance: unknown, info: string): void {
    const logger = getLogger();
    if (!logger) return;
    const componentName =
      typeof instance === 'object' && instance !== null
        ? (instance as { $options?: { name?: string; __name?: string } }).$options?.name ||
          (instance as { __name?: string }).__name
        : undefined;
    logger.error(EV.APP_VUE_ERROR, { info, component: componentName }, err);
  }

  function onVueWarn(message: string, instance: unknown): void {
    const logger = getLogger();
    if (!logger) return;
    const componentName =
      typeof instance === 'object' && instance !== null
        ? (instance as { $options?: { name?: string } }).$options?.name
        : undefined;
    logger.warn('app.vue.warning', { message: sanitizeMessage(message), component: componentName });
  }

  function onVitePreloadError(event: Event): void {
    const logger = getLogger();
    if (!logger) return;
    const detail = (event as CustomEvent).detail;
    logger.warn(EV.APP_CHUNK_LOAD_FAILED, { type: 'vite:preloadError' }, detail ?? undefined);
  }

  function onPageHide(): void {
    getLogger()?.flushForPageHide();
  }

  function onOnline(): void {
    const logger = getLogger();
    if (!logger) return;
    logger.info(EV.APP_NETWORK_ONLINE, { reason: 'navigator.onLine' });
    // Connectivity is back: try to ship the offline queue immediately.
    void logger.flush();
  }

  function onOffline(): void {
    const logger = getLogger();
    if (!logger) return;
    logger.warn(EV.APP_NETWORK_OFFLINE, {
      queuedLogs: logger.pendingRemote(),
    });
  }

  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('vite:preloadError', onVitePreloadError);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  if (app) {
    app.config.errorHandler = onVueError as NonNullable<App<unknown>['config']['errorHandler']>;
    if (captureWarnings) {
      app.config.warnHandler = onVueWarn as unknown as NonNullable<
        App<unknown>['config']['warnHandler']
      >;
    }
  }

  installed = true;

  return () => {
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('vite:preloadError', onVitePreloadError);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    if (app) {
      app.config.errorHandler = undefined;
      app.config.warnHandler = undefined;
    }
    installed = false;
  };
}

function isProduction(): boolean {
  try {
    return Boolean((import.meta as { env?: { PROD?: boolean } }).env?.PROD);
  } catch {
    return false;
  }
}

/** Log any thrown error without letting it interrupt the caller. */
export function safeError(event: string, context?: Record<string, unknown>, error?: unknown): void {
  try {
    const logger = getActiveLogger();
    if (!logger) return;
    if (error !== undefined) {
      logger.error(event, context, error);
    } else {
      logger.error(event, context);
    }
  } catch {
    /* swallow */
  }
}

/** Convert an arbitrary rejection reason for display/logging. */
export function describeReason(reason: unknown): string {
  try {
    const info = errorToInfo(reason);
    return `${info.name}: ${info.message}`;
  } catch {
    return String(reason);
  }
}