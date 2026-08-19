/**
 * Deterministic sampling.
 *
 * High-volume events (the ones below WARN, e.g. DEBUG map tile traffic) carry
 * a configurable sample rate. Sampling is deterministic on (event, seed) so a
 * given request either always logs or never logs, which keeps traces coherent
 * instead of randomly dropped.
 */

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param event     stable event name
 * @param rate      [0..1] sampling probability
 * @param seed      short stable value for the same action (requestId, userId)
 */
export function shouldSample(event: string, rate: number, seed?: string): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  const h = hashString(`${event}|${seed ?? ''}`);
  return h % 1000 < Math.round(rate * 1000);
}