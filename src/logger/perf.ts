/**
 * Performance classification for timed operations.
 *
 * Every operation that measures durationMs can be tagged with a bucket so it
 * can be alerted on / filtered on:
 *
 *   < slowMs            → "normal"
 *   slowMs .. criticalMs → "slow"
 *   > criticalMs        → "critical"
 *
 * Defaults are tuned for a GIS/API frontend (see the audit report).
 */

export interface PerfThresholds {
  /** Default classification used when no explicit thresholds are given. */
  slowMs: number;
  criticalMs: number;
}

export const API_THRESHOLDS: PerfThresholds = { slowMs: 500, criticalMs: 1500 };
export const MAP_THRESHOLDS: PerfThresholds = { slowMs: 1500, criticalMs: 4000 };
export const FILE_THRESHOLDS: PerfThresholds = { slowMs: 800, criticalMs: 2500 };
export const SAVE_THRESHOLDS: PerfThresholds = { slowMs: 1000, criticalMs: 3000 };

export type PerfBucket = 'normal' | 'slow' | 'critical';

export function classifyDuration(durationMs: number, thresholds: PerfThresholds = API_THRESHOLDS): PerfBucket {
  if (durationMs >= thresholds.criticalMs) return 'critical';
  if (durationMs >= thresholds.slowMs) return 'slow';
  return 'normal';
}

/**
 * Enrich a log context with stable performance metadata so every entry that
 * carries durationMs can be grouped and alerted on by the collector.
 */
export function withPerf(
  context: Record<string, unknown>,
  durationMs: number,
  thresholds: PerfThresholds = API_THRESHOLDS,
): Record<string, unknown> {
  return {
    ...context,
    durationMs: Math.round(durationMs),
    perf: classifyDuration(durationMs, thresholds),
  };
}