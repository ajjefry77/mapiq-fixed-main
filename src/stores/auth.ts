import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  sanitizeInput,
  clearAllSensitiveData,
  setupTokenRefresh,
  isSessionValid
} from '../utils/security'

const API_BASE_URL = import.meta.env.VITE_SERVER + '/api'

interface UserRole {
  id: string | number
  name: string
  Permissions?: { name: string }[]
}

interface UserData {
  id: string | number | null
  name?: string | null
  full_name?: string | null
  username?: string | null
  phone?: string | null
  code?: string | null
  Roles?: UserRole[]
  roles?: string[]
}

const LOGIN_ATTEMPTS_KEY = 'login_attempts'
const LOCKOUT_KEY = 'lockout_until'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000

function getLoginAttempts(): number {
  const attempts = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
  return attempts ? parseInt(attempts, 10) : 0
}

function incrementLoginAttempts(): number {
  const attempts = getLoginAttempts() + 1
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, String(attempts))
  return attempts
}

function resetLoginAttempts(): void {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
  localStorage.removeItem(LOCKOUT_KEY)
}

function isLockedOut(): boolean {
  const lockoutUntil = localStorage.getItem(LOCKOUT_KEY)
  if (!lockoutUntil) return false
  const until = parseInt(lockoutUntil, 10)
  if (Date.now() >= until) {
    localStorage.removeItem(LOCKOUT_KEY)
    return false
  }
  return true
}

function setLockout(): void {
  const until = Date.now() + LOCKOUT_DURATION
  localStorage.setItem(LOCKOUT_KEY, String(until))
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(
    localStorage.getItem('user')
      ? { id: localStorage.getItem('user') }
      : null
  )

  const isLogin = ref<boolean>(false)
  const isMapboxMode = ref<boolean>(localStorage.getItem('mapEngine') === 'mapbox')
  const token = ref<string | null>(localStorage.getItem('token'))
  const userPermissions = ref<string[]>([])
  let authCheckPromise: Promise<void> | null = null
  let isRefreshing = false
  let refreshSubscribers: Array<(token: string) => void> = []

  const isAuthenticated = computed(() => {
    if (!token.value || !user.value) return false
    if (!isSessionValid()) return false
    return true
  })
  const isAdmin = computed(() => {
    if (user.value?.Roles?.some(r => r.name === 'admin')) return true
    if (user.value?.roles?.some(r => r === 'admin')) return true
    return false
  })

  const isGroupManager = computed(() => {
    if (user.value?.Roles?.some(r => r.name === 'group_manager')) return true
    if (user.value?.roles?.some(r => r === 'group_manager')) return true
    return false
  })

  const isUser = computed(() => !isAdmin.value && !isGroupManager.value)
  const fbRoles = ref<string[]>([])
  const displayName = computed(() => user.value?.name || user.value?.username || '')

  const loginAttempts = ref(getLoginAttempts())
  const isLocked = ref(isLockedOut())
  const lockoutRemaining = ref(0)
  let lockoutTimer: ReturnType<typeof setInterval> | null = null

  function updateLockoutStatus() {
    isLocked.value = isLockedOut()
    loginAttempts.value = getLoginAttempts()
    if (isLocked.value) {
      const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10)
      lockoutRemaining.value = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
    } else {
      lockoutRemaining.value = 0
      if (lockoutTimer) {
        clearInterval(lockoutTimer)
        lockoutTimer = null
      }
    }
  }

  function startLockoutTimer() {
    if (lockoutTimer) clearInterval(lockoutTimer)
    lockoutTimer = setInterval(updateLockoutStatus, 1000)
  }

  const setAuthData = (authToken: string, userData: UserData) => {
    token.value = authToken
    user.value = userData
    isLogin.value = true
    authCheckPromise = Promise.resolve()
    localStorage.setItem('token', authToken)
    if (userData.id) localStorage.setItem('user', String(userData.id))
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`

    resetLoginAttempts()
    updateLockoutStatus()

    setupTokenRefresh(
      () => token.value,
      async () => {
        await checkAuth()
        return !!token.value
      }
    )
  }

  const clearAuthData = () => {
    token.value = null
    user.value = null
    isLogin.value = false
    userPermissions.value = []
    authCheckPromise = null
    isRefreshing = false
    refreshSubscribers = []
    clearAllSensitiveData()
    delete axios.defaults.headers.common['Authorization']
  }

  const login = async (username: string, password: string) => {
    if (isLockedOut()) {
      updateLockoutStatus()
      if (!lockoutTimer) startLockoutTimer()
      const remaining = Math.ceil(
        (parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10) - Date.now()) / 1000
      )
      return {
        success: false,
        error: `حساب شما قفل شده است. ${Math.ceil(remaining / 60)} دقیقه صبر کنید.`
      }
    }

    const sanitizedUsername = sanitizeInput(username)

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: sanitizedUsername,
        password
      })
      const { token: authToken, user: userData } = response.data

      if (!authToken || !userData) {
        throw new Error('پاسخ سرور نامعتبر')
      }

      setAuthData(authToken, userData)
      await loadUserPermissions()

      return { success: true }
    } catch (error: any) {
      const attempts = incrementLoginAttempts()
      loginAttempts.value = attempts

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        setLockout()
        updateLockoutStatus()
        startLockoutTimer()
        return {
          success: false,
          error: `تلاش‌های ناموفق بیش از حد. حساب شما برای ۱۵ دقیقه قفل شد.`
        }
      }

      const remaining = MAX_LOGIN_ATTEMPTS - attempts
      return {
        success: false,
        error: error.response?.data?.error || `خطای احراز هویت. ${remaining} تلاش باقی‌مانده.`
      }
    }
  }

  const register = async (userData: Record<string, any>) => {
    try {
      const sanitizedData: Record<string, any> = {}
      for (const [key, value] of Object.entries(userData)) {
        if (typeof value === 'string') {
          sanitizedData[key] = sanitizeInput(value)
        } else {
          sanitizedData[key] = value
        }
      }

      const response = await axios.post(`${API_BASE_URL}/register`, sanitizedData)
      const { token: authToken, user: userInfo } = response.data

      if (!authToken || !userInfo) {
        throw new Error('پاسخ سرور نامعتبر')
      }

      setAuthData(authToken, userInfo)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'خطای ثبت نام',
      }
    }
  }

  const logout = () => {
    clearAuthData()
  }

  const checkAuth = async () => {
    if (!token.value) return

    if (!isSessionValid()) {
      clearAuthData()
      return
    }

    if (authCheckPromise) return authCheckPromise

    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    authCheckPromise = (async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/${user.value?.id || 'me'}`)

        if (!response.data) {
          throw new Error('پاسخ خالی از سرور')
        }

        const userData = response.data
        if (!userData.id && !userData.Roles && !userData.roles) {
          throw new Error('داده‌های کاربر نامعتبر')
        }

        user.value = userData
        await loadUserPermissions()
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuthData()
        }
      }
    })()
    return authCheckPromise
  }

  const loadUserPermissions = async () => {
    const perms: string[] = []

    if (user.value?.Roles?.length) {
      for (const role of user.value.Roles) {
        if (role?.Permissions?.length) {
          perms.push(...role.Permissions.map(p => p.name))
        }
      }
    }
    if (user.value?.roles?.includes('admin')) {
      perms.push('*')
    }
    if (user.value?.roles?.includes('group_manager')) {
      perms.push('view_groups', 'manage_groups', 'view_forms', 'manage_forms')
    }

    userPermissions.value = [...new Set(perms)]
  }

  const hasPermission = (permission: string) => {
    if (!isAuthenticated.value) return false
    if (userPermissions.value.includes('*')) return true
    if (userPermissions.value.includes(permission)) return true
    if (user.value?.Roles?.some(r => r.name === 'admin')) return true
    if (user.value?.roles?.includes('admin')) return true
    if (isGroupManager.value) {
      const gmPerms = ['view_groups', 'manage_groups', 'view_forms', 'manage_forms']
      if (gmPerms.includes(permission)) return true
    }
    return false
  }

  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(p => hasPermission(p))
  }

  const hasAllPermissions = (permissions: string[]) => {
    return permissions.every(p => hasPermission(p))
  }

  const isRole = (roleName: string) => {
    if (user.value?.Roles?.some(r => r.name === roleName)) return true
    if (user.value?.roles?.some(r => r === roleName)) return true
    return false
  }

  const syncFb = async () => {
    try {
      const API = import.meta.env.VITE_SERVER + '/api'
      const res = await axios.post(`${API}/sync/login`, {
        phone: user.value?.phone,
        full_name: user.value?.name || user.value?.full_name,
      })
      const data = res.data
      if (data.success) {
        fbRoles.value = data.data.user.roles || []
        localStorage.setItem('fb_token', data.data.token)
        return data.data
      }
    } catch (e) {
      console.warn('syncFb failed')
    }
  }

  const switchMapEngine = () => {
    isMapboxMode.value = !isMapboxMode.value
    localStorage.setItem('mapEngine', isMapboxMode.value ? 'mapbox' : 'cesium')
  }

  updateLockoutStatus()

  return {
    user,
    token,
    isLogin,
    isAuthenticated,
    userPermissions,
    isAdmin,
    isGroupManager,
    isUser,
    fbRoles,
    displayName,
    loginAttempts,
    isLocked,
    lockoutRemaining,
    isMapboxMode,
    switchMapEngine,
    login,
    register,
    logout,
    checkAuth,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    syncFb,
  }
})
