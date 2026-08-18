const API_BASE_URL = import.meta.env.VITE_SERVER + '/api'

export interface SecurityConfig {
  tokenRefreshInterval: number
  sessionTimeout: number
  maxRetryAttempts: number
}

const DEFAULT_CONFIG: SecurityConfig = {
  tokenRefreshInterval: 5 * 60 * 1000,
  sessionTimeout: 30 * 60 * 1000,
  maxRetryAttempts: 3
}

let refreshTimer: ReturnType<typeof setInterval> | null = null
let sessionTimer: ReturnType<typeof setTimeout> | null = null
let lastActivity = Date.now()
let activityDebounceTimer: ReturnType<typeof setTimeout> | null = null
let securityListenersAttached = false

const activityEvents: Array<[keyof DocumentEventMap, EventListener]> = []

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

export function trackActivity(): void {
  lastActivity = Date.now()
  if (activityDebounceTimer) clearTimeout(activityDebounceTimer)
  activityDebounceTimer = setTimeout(() => {
    resetSessionTimer()
  }, 300)
}

export function resetSessionTimer(): void {
  if (sessionTimer) clearTimeout(sessionTimer)
  sessionTimer = setTimeout(() => {
    const event = new CustomEvent('session-expired')
    window.dispatchEvent(event)
  }, DEFAULT_CONFIG.sessionTimeout)
}

export function isSessionValid(): boolean {
  return Date.now() - lastActivity < DEFAULT_CONFIG.sessionTimeout
}

export function setupSecurityHeaders(): void {
  const metaHeaders: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }

  Object.entries(metaHeaders).forEach(([key, value]) => {
    const meta = document.createElement('meta')
    meta.httpEquiv = key
    meta.content = value
    document.head.appendChild(meta)
  })
}

export function setupTokenRefresh(getToken: () => string | null, refreshFn: () => Promise<boolean>): void {
  if (refreshTimer) clearInterval(refreshTimer)

  refreshTimer = setInterval(async () => {
    const token = getToken()
    if (token && !isSessionValid()) {
      try {
        await refreshFn()
      } catch {
        const event = new CustomEvent('auth-error')
        window.dispatchEvent(event)
      }
    }
  }, DEFAULT_CONFIG.tokenRefreshInterval)
}

export function setupSecurityMonitoring(): void {
  if (securityListenersAttached) return

  const events: Array<keyof DocumentEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
  events.forEach((eventName) => {
    const handler = trackActivity as EventListener
    activityEvents.push([eventName, handler])
    document.addEventListener(eventName, handler, { passive: true })
  })

  const clearAndRedirect = () => {
    clearAllSensitiveData()
    window.location.href = '/login'
  }

  window.addEventListener('auth-error', clearAndRedirect)
  window.addEventListener('session-expired', clearAndRedirect)
  securityListenersAttached = true
}

export function teardownSecurityMonitoring(): void {
  if (!securityListenersAttached) return
  activityEvents.forEach(([eventName, handler]) => {
    document.removeEventListener(eventName, handler)
  })
  activityEvents.length = 0
  if (activityDebounceTimer) clearTimeout(activityDebounceTimer)
  if (sessionTimer) clearTimeout(sessionTimer)
  if (refreshTimer) clearInterval(refreshTimer)
  activityDebounceTimer = null
  sessionTimer = null
  refreshTimer = null
  securityListenersAttached = false
}

export function clearAllSensitiveData(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('fb_token')
  localStorage.removeItem('login_attempts')
  localStorage.removeItem('lockout_until')
  sessionStorage.clear()

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
  }
}

export function initSecurity(): void {
  setupSecurityHeaders()
  setupSecurityMonitoring()
  trackActivity()
}
