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
  if (entry.context && typeof entry.context.message === 'string' && entry.context.message) {
    return String(entry.context.message);
  }
  return entry.event;
}

/** Human-readable single-line rendering used by the Console transport. */
export function formatForConsole(entry: LogEntry): string {
  const meta = LEVEL_META[entry.level];
  const requestTag = entry.requestId ? ` reqId=${entry.requestId}` : '';
  const traceTag = entry.traceId ? ` traceId=${entry.traceId}` : '';
  return `[${entry.timestamp}] ${meta.label} ${entry.event} — ${formatMessage(entry)}${requestTag}${traceTag}`;
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