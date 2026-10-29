export function getAuthHeaders(extra: Record<string, unknown> = {}): Record<string, string> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : "";

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;
}

export function getApiPayload<T>(payload: unknown, fallback: T[] = []): T[] {
  const responseBody = (payload as any)?.data;
  const value = responseBody?.data ?? responseBody ?? payload ?? fallback;

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value == null) {
    return fallback;
  }

  return [value as T];
}

export function unwrapApiResponse<T>(payload: unknown, fallback: T): T {
  const data = (payload as { data?: unknown })?.data;

  if (
    data &&
    typeof data === "object" &&
    "success" in (data as object) &&
    (data as { success?: boolean }).success === true &&
    "data" in (data as object)
  ) {
    return (data as { data: T }).data ?? fallback;
  }

  return (payload as { data?: T })?.data ?? fallback;
}

export function asArray<T>(value: T | T[] | null | undefined, fallback: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return [value];
}
