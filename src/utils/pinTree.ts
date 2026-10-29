export function flattenPins(list: unknown, out: any[] = []): any[] {
  const arr = Array.isArray(list) ? list : (list as { value?: unknown } | null)?.value || [];

  for (const pin of Array.isArray(arr) ? arr : []) {
    if (!pin) continue;

    if ((pin as { type?: string })?.type === "group" || (pin as { type?: string })?.type === "folder") {
      flattenPins((pin as { children?: unknown }).children, out);
      continue;
    }

    out.push(pin);
  }

  return out;
}
