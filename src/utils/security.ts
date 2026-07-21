import axios from 'axios'

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

export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getCSRFToken(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  return metaTag ? metaTag.getAttribute('content') : null
}

export function setupCSRFProtection(): void {
  const csrfToken = generateCSRFToken()
  const meta = document.createElement('meta')
  meta.name = 'csrf-token'
  meta.content = csrfToken
  document.head.appendChild(meta)

  axios.interceptors.request.use((config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
    return config
  })
}

export function trackActivity(): void {
  lastActivity = Date.now()
  resetSessionTimer()
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
  document.addEventListener('click', trackActivity)
  document.addEventListener('keydown', trackActivity)
  document.addEventListener('mousemove', trackActivity)
  document.addEventListener('scroll', trackActivity)
  document.addEventListener('touchstart', trackActivity)

  window.addEventListener('auth-error', () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('fb_token')
    window.location.href = '/login'
  })

  window.addEventListener('session-expired', () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('fb_token')
    window.location.href = '/login'
  })
}

export function clearAllSensitiveData(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('fb_token')
  sessionStorage.clear()

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
  }
}

export function detectDevTools(): void {
  const threshold = 160

  setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold

    if (widthThreshold || heightThreshold) {
      console.warn('DevTools detected!')
    }
  }, 1000)

  let devtoolsOpen = false
  const element = new Image()
  Object.defineProperty(element, 'id', {
    get() {
      devtoolsOpen = true
      return 'devtools'
    }
  })

  setInterval(() => {
    devtoolsOpen = false
    console.dir(element)
    if (devtoolsOpen) {
      console.warn('Developer tools detected!')
    }
  }, 1000)
}

export function initSecurity(): void {
  setupCSRFProtection()
  setupSecurityHeaders()
  setupSecurityMonitoring()
  trackActivity()
}
