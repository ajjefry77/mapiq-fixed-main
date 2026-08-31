/**
 * Lightweight frontend logger — one file.
 *
 * Public API:
 *   import { logger, EV } from '@/logger'
 *   logger.info(EV.API_REQUEST_SUCCESS, { url, status })
 *   logger.warn('map.layer.failed', { layerName }, err)
 *
 * Bootstrap (main.ts):
 *   initLogging()                        // reads VITE_LOG_* env
 *   installGlobalErrorHandlers(app)      // window + Vue errors → logger
 *   setupApiLogging(axios)               // axios lifecycle → logger
 *
 * Guarantees:
 *   - never throws (a broken logging path can't crash the app)
 *   - redacts credentials/tokens before anything is printed or sent
 *   - caps identical error flood with a tiny dedupe window
 */
import type { App } from 'vue'
import type { AxiosInstance, AxiosResponse } from 'axios'

/* ============================== levels ============================== */

export type LogLevelNumber = 10 | 20 | 30 | 40 | 50 | 60
export type LogLevelName = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const

const LEVEL_NAMES: Record<LogLevelNumber, LogLevelName> = {
  [LOG_LEVELS.TRACE]: 'TRACE',
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.FATAL]: 'FATAL',
}

export function isLevelEnabled(level: LogLevelNumber, threshold: LogLevelNumber): boolean {
  return level >= threshold
}

export function levelNameOf(level: LogLevelNumber): LogLevelName {
  return LEVEL_NAMES[level] ?? 'INFO'
}

/* ============================== events ============================== */

export const EV = {
  APP_BOOT: 'app.initialized',
  APP_CONFIG_LOAD_FAILED: 'app.config.load.failed',
  APP_RUNTIME_ERROR: 'app.runtime.error',
  APP_PROMISE_REJECTED: 'app.promise.rejected',
  APP_VUE_ERROR: 'app.vue.error',
  APP_CHUNK_LOAD_FAILED: 'app.chunk.load.failed',
  APP_NETWORK_ONLINE: 'app.network.online',
  APP_NETWORK_OFFLINE: 'app.network.offline',

  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_REGISTER_SUCCESS: 'auth.register.success',
  AUTH_REGISTER_FAILED: 'auth.register.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',
  AUTH_SYNC_FB_FAILED: 'auth.sync.fb.failed',

  API_REQUEST_STARTED: 'api.request.started',
  API_REQUEST_SUCCESS: 'api.request.success',
  API_REQUEST_FAILED: 'api.request.failed',
  API_REQUEST_TIMEOUT: 'api.request.timeout',
  API_REQUEST_RATE_LIMITED: 'api.request.rate.limited',

  ROUTE_ENTER: 'route.enter',
  ROUTE_NAVIGATION_FAILED: 'route.navigation.failed',

  MAP_TILESET_FAILED: 'map.tileset.failed',
} as const

/* ============================== types ============================== */

export type LogContext = Record<string, unknown>

export interface ErrorInfo {
  name: string
  message: string
  stack?: string
  code?: string | number
  status?: number
  url?: string
  method?: string
}

export interface LogEntry {
  timestamp: string
  level: LogLevelNumber
  levelName: LogLevelName
  event: string
  message?: string
  context?: LogContext
  error?: ErrorInfo
  sessionId?: string
  environment: string
  appVersion: string
  browser?: string
  os?: string
  route?: string
}

export interface LoggerConfig {
  enabled: boolean
  level: LogLevelNumber
  consoleEnabled: boolean
  remoteEnabled: boolean
  remoteEndpoint?: string
  environment: string
  appVersion: string
  flushIntervalMs: number
  batchSize: number
  maxQueueSize: number
  dedupeWindowMs: number
  dedupeMaxPerWindow: number
}

/* ============================== sanitize ============================== */

const SENSITIVE_KEY_RE =
  /(password|passwd|pwd|secret|token|authorization|auth[\s_\-]?key|api[\s_\-]?key|cookie|session|otp|signature|access[\s_\-]?key|bearer|phone)/i
const SENSITIVE_URL_PARAM_RE =
  /^(token|access_token|refresh_token|apikey|api_key|key|password|passwd|auth|secret|otp|code|sig|signature)$/i
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const BEARER_RE = /\b(bearer|basic|token|apikey|key)\b[=:\s]+[A-Za-z0-9._~+/=\-]{8,}/gi
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

export function stripControlChars(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(CONTROL_RE, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export function maskInlineSecrets(value: string): string {
  return value
    .replace(JWT_RE, '[REDACTED]')
    .replace(BEARER_RE, (_m, prefix: string) => `${prefix} [REDACTED]`)
}

export function sanitizeMessage(message: string): string {
  return stripControlChars(maskInlineSecrets(message.slice(0, 2000)))
}

export function sanitizeUrl(url?: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url, 'http://localhost')
    parsed.hash = ''
    for (const key of parsed.searchParams.keys()) {
      if (SENSITIVE_URL_PARAM_RE.test(key)) parsed.searchParams.set(key, '[REDACTED]')
    }
    return stripControlChars(parsed.toString().slice(0, 1000))
  } catch {
    return stripControlChars(maskInlineSecrets(url.slice(0, 1000)))
  }
}

export function errorToInfo(err: unknown): ErrorInfo {
  if (err instanceof Error) {
    const code = (err as unknown as { code?: string | number }).code
    return {
      name: err.name || 'Error',
      message: sanitizeMessage(err.message || String(err.name)),
      stack: sanitizeMessage(err.stack || ''),
      ...(code !== undefined ? { code } : {}),
    }
  }

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    const axiosLike = obj as {
      response?: { status?: number }
      config?: { url?: string; method?: string }
    }
    const info: ErrorInfo = {
      name: typeof obj.name === 'string' ? obj.name : 'Error',
      message: sanitizeMessage(
        typeof obj.message === 'string'
          ? obj.message
          : typeof obj.reason === 'string'
            ? obj.reason
            : JSON.stringify(obj).slice(0, 500),
      ),
    }
    if (typeof axiosLike.response?.status === 'number') info.status = axiosLike.response.status
    if (axiosLike.config?.url) info.url = sanitizeUrl(axiosLike.config.url)
    if (axiosLike.config?.method) info.method = String(axiosLike.config.method).toUpperCase()
    if (typeof obj.code === 'string' || typeof obj.code === 'number') info.code = obj.code
    return info
  }

  if (typeof err === 'string') {
    const message = sanitizeMessage(err)
    return { name: /error|failed|خطا/i.test(message) ? 'Error' : 'Rejection', message }
  }

  return { name: 'UnknownError', message: 'An unknown error occurred' }
}

const MAX_DEPTH = 6

function visitSanitized(
  value: unknown,
  keyHint: string | undefined,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value
  if (keyHint !== undefined && SENSITIVE_KEY_RE.test(keyHint)) return '[REDACTED]'

  const t = typeof value
  if (t === 'string') return sanitizeMessage(value as string)
  if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') return value
  if (t === 'function') return '[Function]'
  if (value instanceof Date) return (value as Date).toISOString()
  if (value instanceof RegExp) return String(value)
  if (value instanceof Error) return errorToInfo(value as unknown as Error)
  if (value instanceof Map) return `[Map(${value.size})]`
  if (value instanceof Set) return `[Set(${value.size})]`

  if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    return visitSanitized((value as { toJSON: () => unknown }).toJSON(), keyHint, depth, seen)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return []
    if (value.length > 20 || depth > MAX_DEPTH) return `[Array(${value.length})]`
    return value.map((item) => visitSanitized(item, undefined, depth + 1, seen))
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) return '[Circular]'
    seen.add(obj)

    const keys = Object.keys(obj)
    const keysToVisit = keys.length > 30 ? keys.slice(0, 30) : keys
    if (keys.length > 30 || depth > MAX_DEPTH) {
      const preview: Record<string, unknown> = {}
      for (const k of keysToVisit) preview[k] = visitSanitized(obj[k], k, depth + 1, seen)
      return preview
    }
    const out: Record<string, unknown> = {}
    for (const k of keys) out[k] = visitSanitized(obj[k], k, depth + 1, seen)
    return out
  }

  return value
}

export function sanitizeContext(ctx?: LogContext): LogContext | undefined {
  if (!ctx || typeof ctx !== 'object') return ctx
  const out = visitSanitized(ctx, undefined, 0, new WeakSet<object>())
  return typeof out === 'object' && out !== null ? (out as LogContext) : {}
}

/* ============================== config ============================== */

const LEVEL_ALIASES: Record<string, LogLevelNumber> = {
  trace: LOG_LEVELS.TRACE,
  debug: LOG_LEVELS.DEBUG,
  info: LOG_LEVELS.INFO,
  warn: LOG_LEVELS.WARN,
  error: LOG_LEVELS.ERROR,
  fatal: LOG_LEVELS.FATAL,
}

function env(name: string): string | undefined {
  const value = (import.meta.env as unknown as Record<string, string | undefined>)[name]
  return value && String(value).trim() ? String(value) : undefined
}

function toNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return value !== undefined && Number.isFinite(n) ? n : fallback
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return String(value).toLowerCase() === 'true'
}

export function resolveConfig(overrides?: Partial<LoggerConfig>): LoggerConfig {
  const mode: string = import.meta.env.MODE || 'development'
  const environment = env('VITE_APP_ENV') ?? mode
  const endpoint = env('VITE_LOG_ENDPOINT')
  const defaultLevel =
    environment === 'production'
      ? LOG_LEVELS.WARN
      : environment === 'development'
        ? LOG_LEVELS.DEBUG
        : LOG_LEVELS.INFO

  const config: LoggerConfig = {
    enabled: toBool(env('VITE_LOG_ENABLED'), true),
    level: LEVEL_ALIASES[String(env('VITE_LOG_LEVEL') ?? '').toLowerCase()] ?? defaultLevel,
    consoleEnabled: toBool(env('VITE_LOG_CONSOLE_ENABLED'), true),
    remoteEnabled: toBool(env('VITE_REMOTE_LOGGING_ENABLED'), Boolean(endpoint)),
    remoteEndpoint: endpoint,
    environment,
    appVersion: env('VITE_APP_VERSION') ?? '0.0.0',
    flushIntervalMs: toNumber(env('VITE_LOG_FLUSH_INTERVAL'), 5000),
    batchSize: toNumber(env('VITE_LOG_BATCH_SIZE'), 10),
    maxQueueSize: toNumber(env('VITE_LOG_MAX_QUEUE_SIZE'), 200),
    dedupeWindowMs: toNumber(env('VITE_LOG_DEDUPE_WINDOW'), 60000),
    dedupeMaxPerWindow: toNumber(env('VITE_LOG_DEDUPE_MAX'), 10),
  }

  return overrides ? { ...config, ...overrides } : config
}

/* ============================== transports ============================== */

export interface Transport {
  readonly name: string
  level: LogLevelNumber
  handle(entry: LogEntry): void
  flush?(): Promise<void>
  flushForPageHide?(): void
  dispose?(): void
  pending?(): number
}

function entryToJson(entry: LogEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.levelName,
    event: entry.event,
    message: entry.message,
    context: entry.context,
    environment: entry.environment,
    appVersion: entry.appVersion,
  }
  if (entry.error) base.error = entry.error
  if (entry.sessionId) base.sessionId = entry.sessionId
  if (entry.route) base.route = entry.route
  return base
}

class ConsoleTransport implements Transport {
  readonly name = 'console'
  constructor(
    public level: LogLevelNumber,
    private readonly enabled: boolean,
  ) {}

  handle(entry: LogEntry): void {
    if (!this.enabled) return
    // eslint-disable-next-line no-console
    const method = entry.level >= LOG_LEVELS.WARN ? 'warn' : entry.level >= LOG_LEVELS.INFO ? 'log' : 'debug'
    const line = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.levelName.padEnd(5)} ${entry.event} — ${entry.message ?? ''}`
    // eslint-disable-next-line no-console
    console[method](line, entry.context && Object.keys(entry.context).length ? entry.context : '')
  }
}

class RemoteTransport implements Transport {
  readonly name = 'remote'
  level = LOG_LEVELS.INFO
  private buffer: LogEntry[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly config: LoggerConfig) {
    if (config.remoteEndpoint) {
      this.timer = setInterval(() => void this.flush(), config.flushIntervalMs)
    }
  }

  handle(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return
    this.buffer.push(entry)
    if (this.buffer.length >= this.config.batchSize) void this.flush()
    else if (this.buffer.length > this.config.maxQueueSize) this.buffer.shift()
  }

  async flush(): Promise<void> {
    const endpoint = this.config.remoteEndpoint
    if (!endpoint || this.buffer.length === 0) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    const batch = this.buffer.splice(0)
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map(entryToJson)),
        keepalive: true,
      })
    } catch {
      this.buffer = batch.concat(this.buffer).slice(0, this.config.maxQueueSize)
    }
  }

  flushForPageHide(): void {
    const endpoint = this.config.remoteEndpoint
    if (!endpoint || this.buffer.length === 0) return
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const batch = this.buffer.splice(0)
      try {
        navigator.sendBeacon(endpoint, JSON.stringify(batch.map(entryToJson)))
      } catch {
        this.buffer = batch
      }
    }
  }

  pending(): number {
    return this.buffer.length
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.buffer = []
  }
}

export function createTransports(config: LoggerConfig): Transport[] {
  const transports: Transport[] = []
  if (config.consoleEnabled) transports.push(new ConsoleTransport(config.level, true))
  if (config.remoteEnabled && config.remoteEndpoint) transports.push(new RemoteTransport(config))
  return transports
}

/* ============================== logger ============================== */

function formatMessage(entry: LogEntry): string {
  if (entry.error) return entry.error.message || entry.error.name
  if (entry.context && typeof entry.context.message === 'string') return String(entry.context.message)
  return entry.event
}

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem('miq_session_id')
    if (existing) return existing
    const fresh = crypto.randomUUID?.() ?? `s-${Date.now().toString(36)}`
    sessionStorage.setItem('miq_session_id', fresh)
    return fresh
  } catch {
    return `s-${Date.now().toString(36)}`
  }
}

function getBrowserInfo(): { browser: string; os: string } {
  try {
    const ua = navigator.userAgent
    const browser = /Edg\//.test(ua)
      ? 'edge'
      : /OPR\/|Opera/.test(ua)
        ? 'opera'
        : /Firefox\//.test(ua)
          ? 'firefox'
          : /Chrome\//.test(ua)
            ? 'chrome'
            : /Safari\//.test(ua)
              ? 'safari'
              : 'unknown'
    const os = /Windows/.test(ua)
      ? 'windows'
      : /Android/.test(ua)
        ? 'android'
        : /iPhone|iPad|iPod/.test(ua)
          ? 'ios'
          : /Mac OS X/.test(ua)
            ? 'macos'
            : /Linux/.test(ua)
              ? 'linux'
              : 'unknown'
    return { browser, os }
  } catch {
    return { browser: 'unknown', os: 'unknown' }
  }
}

function getCurrentRoute(): string {
  try {
    return sanitizeUrl(window.location.pathname + window.location.search)
  } catch {
    return ''
  }
}

export class Logger {
  private readonly config: LoggerConfig
  private readonly transports: Transport[]
  private readonly dedupe = new Map<string, { count: number; firstTs: number }>()
  private suppressedCount = 0

  constructor(config: LoggerConfig, transports: Transport[] = []) {
    this.config = config
    this.transports = transports
  }

  trace(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.TRACE, event, context)
  }

  debug(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.DEBUG, event, context)
  }

  info(event: string, context?: LogContext): void {
    this.write(LOG_LEVELS.INFO, event, context)
  }

  warn(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.WARN, event, context, error)
  }

  error(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.ERROR, event, context, error)
  }

  fatal(event: string, context?: LogContext, error?: unknown): void {
    this.write(LOG_LEVELS.FATAL, event, context, error)
  }

  write(level: LogLevelNumber, event: string, context?: LogContext, error?: unknown): void {
    if (!this.config.enabled || !isLevelEnabled(level, this.config.level)) return
    try {
      const entry = this.buildEntry(level, event, context, error)
      if (entry) this.dispatch(entry)
    } catch {
      /* the logger itself must never throw */
    }
  }

  flush(): Promise<void> {
    return Promise.allSettled(
      this.transports.map((t) => (typeof t.flush === 'function' ? t.flush() : Promise.resolve())),
    ).then(() => undefined)
  }

  flushForPageHide(): void {
    for (const t of this.transports) t.flushForPageHide?.()
  }

  pending(): number {
    return this.transports.reduce((sum, t) => sum + (t.pending?.() ?? 0), 0)
  }

  dispose(): void {
    for (const t of this.transports) t.dispose?.()
    this.dedupe.clear()
  }

  private buildEntry(
    level: LogLevelNumber,
    event: string,
    context?: LogContext,
    error?: unknown,
  ): LogEntry | null {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: levelNameOf(level),
      event: sanitizeMessage(event),
      context: sanitizeContext(context),
      sessionId: getSessionId(),
      environment: this.config.environment,
      appVersion: this.config.appVersion,
      browser: getBrowserInfo().browser,
      os: getBrowserInfo().os,
      route: getCurrentRoute(),
    }

    if (error !== undefined) {
      const info = errorToInfo(error)
      entry.error = info
      if (!this.dedupShouldLog(`${event}|${info.name}|${info.message}`)) return null
    }

    entry.message = formatMessage(entry)
    return entry
  }

  private dedupShouldLog(signature: string): boolean {
    const now = Date.now()
    const record = this.dedupe.get(signature)
    if (!record || now - record.firstTs > this.config.dedupeWindowMs) {
      this.dedupe.set(signature, { count: 1, firstTs: now })
      return true
    }
    record.count++
    if (record.count > this.config.dedupeMaxPerWindow) {
      this.suppressedCount++
      return false
    }
    return true
  }

  private dispatch(entry: LogEntry): void {
    for (const t of this.transports) {
      try {
        if (isLevelEnabled(entry.level, t.level)) t.handle(entry)
      } catch {
        /* one broken transport must not affect the others */
      }
    }
  }
}

/* ============================== axios lifecycle ============================== */

interface TimedConfig {
  __startedAt?: number
}

export function setupApiLogging(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    ;(config as unknown as TimedConfig).__startedAt = Date.now()
    getLogger().debug(EV.API_REQUEST_STARTED, {
      method: config.method?.toUpperCase(),
      url: sanitizeUrl(config.url),
    })
    return config
  })

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as unknown as TimedConfig
      const durationMs = Date.now() - (config.__startedAt ?? Date.now())
      getLogger().info(EV.API_REQUEST_SUCCESS, {
        method: response.config.method?.toUpperCase(),
        url: sanitizeUrl(response.config.url),
        status: response.status,
        durationMs,
      })
      return response
    },
    (requestError: unknown) => {
      const err = requestError as {
        config?: unknown
        response?: { status?: number }
        code?: string
        message?: string
      }
      const config = err.config as TimedConfig | undefined
      const durationMs = config?.__startedAt ? Date.now() - config.__startedAt : 0
      const status = err.response?.status
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')
      getLogger().error(isTimeout ? EV.API_REQUEST_TIMEOUT : EV.API_REQUEST_FAILED, {
        method: (config as { method?: string } | undefined)?.method?.toUpperCase(),
        url: sanitizeUrl((config as { url?: string } | undefined)?.url),
        status,
        durationMs,
        errorCode: err.code,
      }, requestError)
      return Promise.reject(requestError)
    },
  )
}

/* ============================== global handlers ============================== */

let installed = false

export function installGlobalErrorHandlers(app?: App<unknown> | null): () => void {
  if (installed) return () => {}

  const onWindowError = (event: ErrorEvent) => {
    getLogger().error(EV.APP_RUNTIME_ERROR, {
      type: 'window.error',
      message: sanitizeMessage(event.message || ''),
      filename: sanitizeMessage(event.filename || ''),
      lineno: event.lineno,
      colno: event.colno,
    }, event.error ?? new Error(event.message || 'Unknown window error'))
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    getLogger().error(EV.APP_PROMISE_REJECTED, {
      type: 'unhandledrejection',
      message:
        event.reason instanceof Error
          ? undefined
          : sanitizeMessage(String(event.reason)),
    }, event.reason)
  }

  const onVueError = (err: unknown, instance: unknown, info: string) => {
    const name =
      typeof instance === 'object' && instance !== null
        ? (instance as { $options?: { name?: string }; __name?: string }).$options?.name ||
          (instance as { __name?: string }).__name
        : undefined
    getLogger().error(EV.APP_VUE_ERROR, { info, component: name }, err)
  }

  const onVueWarn = (message: string, instance: unknown) => {
    const name =
      typeof instance === 'object' && instance !== null
        ? (instance as { $options?: { name?: string } }).$options?.name
        : undefined
    getLogger().warn('app.vue.warning', { message: sanitizeMessage(message), component: name })
  }

  const onPageHide = () => getLogger().flushForPageHide()
  const onVitePreloadError = (event: Event) => {
    getLogger().warn(EV.APP_CHUNK_LOAD_FAILED, { type: 'vite:preloadError' }, (event as CustomEvent).detail)
  }
  const onOnline = () => {
    getLogger().info(EV.APP_NETWORK_ONLINE, { reason: 'navigator.onLine' })
    void getLogger().flush()
  }
  const onOffline = () =>
    getLogger().warn(EV.APP_NETWORK_OFFLINE, { queuedLogs: getLogger().pending() })

  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('vite:preloadError', onVitePreloadError)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if (app) {
    app.config.errorHandler = onVueError as NonNullable<App<unknown>['config']['errorHandler']>
    try {
      const isDev = Boolean(import.meta.env.DEV)
      if (isDev) app.config.warnHandler = onVueWarn as unknown as NonNullable<App<unknown>['config']['warnHandler']>
    } catch {
      /* ignore */
    }
  }

  installed = true

  return () => {
    window.removeEventListener('error', onWindowError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('vite:preloadError', onVitePreloadError)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (app) {
      app.config.errorHandler = undefined
      app.config.warnHandler = undefined
    }
    installed = false
  }
}

/* ============================== singleton ============================== */

let instance: Logger | null = null

export function initLogging(overrides?: Partial<LoggerConfig>): Logger {
  const config = resolveConfig(overrides)
  instance = new Logger(config, createTransports(config))
  return instance
}

export function getLogger(): Logger {
  if (!instance) instance = initLogging()
  return instance
}

const loggerHandler: ProxyHandler<Logger> = {
  get(target, prop: string | symbol) {
    const value = getLogger()[prop as keyof Logger]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(getLogger()) : value
  },
}

export const logger: Logger = new Proxy({} as Logger, loggerHandler)

export type { AxiosInstance }