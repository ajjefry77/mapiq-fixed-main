import { sanitizeUrl } from './sanitizer';

/**
 * Runtime context enrichment + correlation ID helpers.
 *
 * sessionId — one per tab session (sessionStorage), stable across pages.
 * requestId — generated per user-triggered request (see RequestScope). Links a
 *             UI action to the resulting API traffic.
 * traceId   — random per user action, lets us trace action -> requests -> errors.
 */

let sessionId: string | null = null;

export function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const existing = window.sessionStorage.getItem('miq_session_id');
    if (existing) {
      sessionId = existing;
      return existing;
    }
  } catch {
    /* sessionStorage unavailable (privacy mode / storage disabled) */
  }
  const fresh = generateId();
  sessionId = fresh;
  try {
    window.sessionStorage.setItem('miq_session_id', fresh);
  } catch {
    /* ignore */
  }
  return fresh;
}

let browserCache: { browser: string; os: string } | null = null;

export function getBrowserInfo(): { browser: string; os: string } {
  if (browserCache) return browserCache;

  let browser = 'unknown';
  let os = 'unknown';

  try {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) browser = 'edge';
    else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = 'opera';
    else if (/Firefox\//.test(ua)) browser = 'firefox';
    else if (/Chrome\//.test(ua)) browser = 'chrome';
    else if (/Safari\//.test(ua)) browser = 'safari';

    if (/Windows/.test(ua)) os = 'windows';
    else if (/Android/.test(ua)) os = 'android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'ios';
    else if (/Mac OS X/.test(ua)) os = 'macos';
    else if (/Linux/.test(ua)) os = 'linux';
  } catch {
    /* ignore */
  }

  browserCache = { browser, os };
  return browserCache;
}

export function getCurrentRoute(): string {
  try {
    const raw = window.location.pathname + window.location.search;
    return sanitizeUrl(raw);
  } catch {
    return '';
  }
}

/**
 * Per-request scope. The axios interceptor sets it when a request starts and
 * clears it when it settles. Every log emitted in between inherits the ids,
 * giving us request-level correlation without async-local-storage hacks.
 */
interface RequestScope {
  requestId?: string;
  traceId?: string;
}
const scopeStack: RequestScope[] = [];
let currentRequestScope: RequestScope = {};
let traceCounter = 0;

export function beginRequest(seedContext?: Record<string, unknown>): RequestScope {
  const requestId = generateId();
  const traceId = seedContext?.traceId ? String(seedContext.traceId) : generateId();
  const scope: RequestScope = { requestId, traceId };
  scopeStack.push(scope);
  currentRequestScope = scope;
  traceCounter++;
  return scope;
}

export function endRequest(): void {
  scopeStack.pop();
  currentRequestScope = scopeStack[scopeStack.length - 1] ?? {};
}

export function getRequestScope(): RequestScope {
  return currentRequestScope;
}

export function getTraceCounter(): number {
  return traceCounter;
}