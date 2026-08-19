/**
 * Duplicate-error detection + rate limiting.
 *
 * Prevents Log Flooding: if the same error signature fires hundreds of times
 * (e.g. a WMS tile request failing in a loop), only a bounded number of
 * entries per time window are emitted. Every suppressed repeat still counts,
 * so bursts are flat instead of wall-to-wall logs.
 */

interface DedupeRecord {
  count: number;
  firstTs: number;
  lastTs: number;
  suppressed: number;
}

export class Deduplicator {
  private records = new Map<string, DedupeRecord>();

  constructor(
    private readonly windowMs: number,
    private readonly maxPerWindow: number,
  ) {}

  /** Returns false when the signature is within rate-limit silence. */
  shouldLog(signature: string, now = Date.now()): boolean {
    const record = this.records.get(signature);

    if (!record) {
      this.prune(now);
      this.records.set(signature, { count: 1, firstTs: now, lastTs: now, suppressed: 0 });
      return true;
    }

    // Window expired -> reset the counter and allow again.
    if (now - record.firstTs > this.windowMs) {
      record.firstTs = now;
      record.count = 1;
      record.suppressed = 0;
      this.prune(now);
      return true;
    }

    record.count++;
    record.lastTs = now;

    if (record.count > this.maxPerWindow) {
      record.suppressed++;
      return false;
    }
    return true;
  }

  /** Total number of occurrences seen so far for a signature. */
  occurrences(signature: string): number {
    return this.records.get(signature)?.count ?? 0;
  }

  private prune(now: number): void {
    for (const [sig, rec] of this.records) {
      if (now - rec.lastTs > this.windowMs * 3) {
        this.records.delete(sig);
      }
    }
  }

  clear(): void {
    this.records.clear();
  }
}