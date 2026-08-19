import type { ErrorInfo, LogContext } from './types';

/**
 * Central sanitizer.
 *
 * Every context object and every error that reaches a transport passes through
 * here. Goals:
 *   1. Never leak credentials, tokens, cookies, secrets or PII.
 *   2. Never blow up on circular references, huge geometry or hostile input.
 *   3. Prevent log-injection by defusing newlines/control characters and
 *      requiring no user input to be interpolated verbatim into a message.
 */

const SENSITIVE_KEY_RE =
  /(password|passwd|pwd|secret|token|authorization|auth[\s_\-]?key|api[\s_\-]?key|cookie|session[\s_\-]?secret|credit[\s_\-]?card|ssn|national[\s_\-]?id|security[\s_\-]?question|otp|signature|access[\s_\-]?key|bearer|phone)/i;

const SENSITIVE_URL_PARAM_RE = /^(token|access_token|refresh_token|apikey|api_key|key|password|passwd|signature|sig|auth|secret|otp|code)$/i;

const JWT_RE = /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g;
const BEARER_RE = /\b(Bearer|Basic|token|apikey|key)\b[=:\s]+[A-Za-z0-9._~+/=\-]{8,}/gi;
const CREDIT_CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const DEEP_GEOMETRY_SCORE = 2;
const ARRAY_METADATA_THRESHOLD = 100;
const STRING_LENGTH_CAP = 2000;

function isRedactableKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

/**
 * Make any string single-line and safe for plain-text log collectors:
 *  - control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F) -> \uXXXX
 *  - CR / LF / TAB            -> literal \\r / \\n / \\t
 *  - backslash                -> \\ (so literal \\n stays distinguishable)
 *
 * Defuses newline-based log injection in single-line files while the original
 * content is still shipped escaped inside structured JSON payloads.
 */
export function stripControlChars(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\');
  return escaped
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(CONTROL_CHARS_RE, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function maskInlineSecrets(value: string): string {
  let out = value;
  out = out.replace(JWT_RE, '[REDACTED]');
  out = out.replace(BEARER_RE, (m, prefix) => `${prefix} [REDACTED]`);
  out = out.replace(CREDIT_CARD_RE, '[REDACTED]');
  return out;
}

export function sanitizeUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, typeof location !== 'undefined' ? location.origin : 'http://localhost');
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_URL_PARAM_RE.test(key)) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    parsed.searchParams.forEach((_v, key, params) => {
      const value = params.get(key);
      if (value && /^(eyJ|Bearer |token)/.test(value)) params.set(key, '[REDACTED]');
    });
    const out = parsed.toString();
    return stripControlChars(out.slice(0, 1000));
  } catch {
    return stripControlChars(maskInlineSecrets(url.slice(0, 1000)));
  }
}

export interface SanitizeOptions {
  depth: number;
  maxEntries: number;
}

function makeSanitizer(opts: SanitizeOptions) {
  const seen = new WeakSet<object>();
  const depthLeft = opts.depth;

  function visitNode(
    value: unknown,
    keyHint: string | undefined,
    depth: number,
  ): unknown {
    if (value === null || value === undefined) return value;

    // Redact by key first: XSS re-injection vectors and secrets die here.
    if (keyHint !== undefined && isRedactableKey(keyHint)) {
      return '[REDACTED]';
    }

    const t = typeof value;

    if (t === 'string') {
      let s = value as string;
      if (s.length > STRING_LENGTH_CAP) s = s.slice(0, STRING_LENGTH_CAP) + '…';
      s = maskInlineSecrets(s);
      return stripControlChars(s);
    }
    if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') {
      return value;
    }
    if (t === 'function') return '[Function]';

    if (value instanceof Date) return (value as Date).toISOString();
    if (value instanceof RegExp) return String(value);
    if (value instanceof Error) return errorToInfo(value as unknown as Error);
    if (value instanceof Map) return `[Map(${(value as Map<unknown, unknown>).size})]`;
    if (value instanceof Set) return `[Set(${(value as Set<unknown>).size})]`;

    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      const prim = (value as { toJSON: () => unknown }).toJSON();
      return visitNode(prim, keyHint, depth);
    }

    if (Array.isArray(value)) {
      const arr = value as unknown[];
      // Protect against massive GIS geometries / feature collections.
      if (arr.length === 0) return [];
      if (arr.length > ARRAY_METADATA_THRESHOLD) {
        return {
          _count: arr.length,
          _preview: arr.slice(0, 3).map((item) => visitNode(item, keyHint, depth + 1)),
        };
      }
      if (depth >= depthLeft) {
        return { _count: arr.length, _truncated: true };
      }
      const depthScore = geometryDepthScore(arr);
      if (depthScore > 5) return { _count: arr.length, _geometry: true };
      return arr.map((item) => visitNode(item, undefined, depth + 1));
    }

    if (t === 'object') {
      const obj = value as Record<string, unknown>;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      const keys = Object.keys(obj);
      const numberOfEntries = keys.length;
      if (numberOfEntries > opts.maxEntries) {
        const preview: Record<string, unknown> = {};
        for (const k of keys.slice(0, opts.maxEntries)) {
          preview[k] = visitNode(obj[k], k, depth + 1);
        }
        preview['_truncatedEntries'] = numberOfEntries - opts.maxEntries;
        return preview;
      }
      if (depth >= depthLeft) return { _objectKeys: numberOfEntries, _truncated: true };

      const out: Record<string, unknown> = {};
      for (const k of keys) {
        out[k] = visitNode(obj[k], k, depth + 1);
      }
      return out;
    }

    return value;
  }

  return visitNode;
}

/**
 * Cheap heuristic: how many levels of pure number-array nesting does this have?
 * Used to avoid materializing massive coordinate arrays.
 */
function geometryDepthScore(arr: unknown[]): number {
  if (!Array.isArray(arr)) return 0;
  let score = 0;
  let node: unknown = arr;
  while (Array.isArray(node) && node.length > 0) {
    score += DEEP_GEOMETRY_SCORE;
    if (typeof node[0] === 'number' || node[0] === null) break;
    node = (node as unknown[])[0];
  }
  return score;
}

export function sanitizeContext(ctx: LogContext | undefined, opts?: Partial<SanitizeOptions>): LogContext | undefined {
  if (!ctx || typeof ctx !== 'object') return ctx;
  const options: SanitizeOptions = {
    depth: opts?.depth ?? 6,
    maxEntries: opts?.maxEntries ?? 200,
  };
  const visit = makeSanitizer(options);
  const sanitized = visit(ctx, undefined, 0);
  return typeof sanitized === 'object' && sanitized !== null ? (sanitized as LogContext) : {};
}

export function sanitizeMessage(message: string): string {
  if (!message) return message;
  return stripControlChars(maskInlineSecrets(message.slice(0, 2000)));
}

/**
 * Convert any thrown value into a normalized, safe ErrorInfo.
 * Never copies `error.response.data` / config headers.
 */
export function errorToInfo(err: unknown): ErrorInfo {
  const fallback = {
    name: 'UnknownError',
    message: 'An unknown error occurred',
  };

  if (err instanceof Error) {
    const info: ErrorInfo = {
      name: err.name || 'Error',
      message: sanitizeMessage(err.message || String(err.name)),
      stack: sanitizeMessage(err.stack || ''),
    };
    const code = (err as unknown as { code?: string | number }).code;
    if (code !== undefined) info.code = code;
    const cause = (err as { cause?: unknown }).cause;
    if (cause != null) {
      info.cause = typeof cause === 'string' ? sanitizeMessage(cause) : String(cause).slice(0, 500);
    }
    return info;
  }

  // Axios-style errors and rejection reasons are plain objects.
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const axiosCandidate = obj as {
      response?: { status?: number };
      config?: { url?: string; method?: string };
      request?: unknown;
    };
    const message = typeof obj.message === 'string' ? obj.message : typeof obj.reason === 'string' ? obj.reason : JSON.stringify(obj).slice(0, 500);

    const info: ErrorInfo = {
      name: typeof obj.name === 'string' ? obj.name : 'Error',
      message: sanitizeMessage(message || 'Rejected promise'),
    };

    if (typeof axiosCandidate.response?.status === 'number') {
      info.status = axiosCandidate.response.status;
    }
    const url = axiosCandidate.config?.url;
    if (url) info.url = sanitizeUrl(url);
    const method = axiosCandidate.config?.method;
    if (method) info.method = String(method).toUpperCase();
    if (typeof axiosCandidate.response?.status === 'number' && axiosCandidate.response.status >= 400) {
      info.code = String(axiosCandidate.response.status);
    }
    if (typeof obj.code === 'string' || typeof obj.code === 'number') info.code = obj.code;
    return info;
  }

  if (typeof err === 'string') {
    const message = sanitizeMessage(err);
    if (/error|failed|خطا/i.test(message)) {
      return { name: 'Error', message };
    }
    return { name: 'Rejection', message };
  }

  return fallback;
}

/** Pre-computed error signature for grouping + dedup. */
export function errorSignature(info: ErrorInfo, event: string): string {
  return `${event}|${info.name}|${info.message}|${String(info.code ?? '')}|${String(info.status ?? '')}`.slice(0, 300);
}