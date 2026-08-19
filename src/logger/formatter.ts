import type { LogEntry } from './types';
import { LEVEL_META } from './levels';

/**
 * Shared formatter. Kept framework-agnostic so both the Console transport
 * (human readable) and the Remote transport (JSON wire format) render the
 * exact same LogEntry.
 */

export function formatMessage(entry: LogEntry): string {
  if (entry.error) {
    const parts: string[] = [];
    parts.push(entry.error.message || entry.error.name);
    if (entry.error.status) parts.push(`[${entry.error.status}]`);
    if (entry.context?.component) parts.push(`(component: ${String(entry.context.component)})`);
    return parts.join(' ');
  }
  if (entry.message) return entry.message;
  if (entry.context && typeof entry.context.message === 'string' && entry.context.message) {
    return String(entry.context.message);
  }
  return entry.event;
}

function localTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  return `${date} ${time}`;
}

/**
 * Human-readable single-line rendering used by the Console transport.
 *
 * Layout:  [MM-DD HH:MM:SS.mmm] LEVEL  event — message  (GET /api/x · 500 · 312ms)  req=… trace=… session=…
 *
 * The extra tags are pulled straight from the (already sanitized) context, so a
 * failing API call, slow request, or broken component is identifiable at a glance.
 */
export function formatForConsole(entry: LogEntry): string {
  const meta = LEVEL_META[entry.level];
  const parts = [`[${localTime(entry.timestamp)}] ${meta.label.padEnd(5)} ${entry.event}`];

  const message = formatMessage(entry);
  if (message && message !== entry.event) parts.push(`— ${message}`);

  const ctx = entry.context ?? {};
  const tags: string[] = [];
  if (ctx.method) tags.push(String(ctx.method).toUpperCase());
  if (ctx.url) tags.push(String(ctx.url));
  if (entry.error?.status) tags.push(`status=${entry.error.status}`);
  else if (ctx.status !== undefined) tags.push(`status=${String(ctx.status)}`);
  if (ctx.durationMs !== undefined) tags.push(`${String(ctx.durationMs)}ms`);
  if (ctx.component) tags.push(`component=${String(ctx.component)}`);
  if (tags.length) parts.push(`(${tags.join(' · ')})`);

  const ids: string[] = [];
  if (entry.requestId) ids.push(`req=${entry.requestId}`);
  if (entry.traceId) ids.push(`trace=${entry.traceId}`);
  if (entry.sessionId) ids.push(`session=${entry.sessionId.slice(0, 8)}`);
  if (ids.length) parts.push(ids.join(' '));

  return parts.join(' ');
}

/**
 * JSON-safe serialization for remote transports. The entry was already
 * sanitized in the pipeline; this is the exact object that is packed into
 * a batch and sent to the ingest endpoint.
 */
export function toJSON(entry: LogEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.levelName,
    event: entry.event,
    message: formatMessage(entry),
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