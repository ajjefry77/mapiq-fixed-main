import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

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

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(
      localStorage.getItem('user')
          ? { id: localStorage.getItem('user') }
          : null
  )

  const isLogin = ref<boolean>(false)
  const token = ref<string | null>(localStorage.getItem('token'))
  const userPermissions = ref<string[]>([])

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => 
    user.value?.Roles?.[0]?.name === 'admin' || 
    user.value?.roles?.includes('admin')
  )
  const isGroupManager = computed(() => 
    user.value?.Roles?.[0]?.name?.includes('group_manager') ||
    user.value?.roles?.some(r => r.includes('group_manager'))
  )
  const fbRoles = ref<string[]>([])
  const displayName = computed(() =>user.value?.name || user.value?.username || '')

  const setAuthData = (authToken: string , userData: UserData) => {
    token.value = authToken
    user.value = userData
    isLogin.value = true;
    localStorage.setItem('token', authToken)
    if (userData.id) localStorage.setItem('user', String(userData.id))
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
  }

  const clearAuthData = () => {
    token.value = null
    user.value = null
    isLogin.value = false;
    userPermissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { username, password })
      const { token: authToken, user: userData } = response.data
      setAuthData(authToken, userData)
      await loadUserPermissions()
      //syncFb()
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'خطای احراز هویت',
      }
    }
  }

  const register = async (userData: Record<string, any>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, userData)
      const { token: authToken, user: userInfo } = response.data
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
    if (token.value) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      try {
        const response = await axios.get(`${API_BASE_URL}/users/${user.value?.id || 'me'}`)
        user.value = response.data
        await loadUserPermissions()
      } catch (error) {
        clearAuthData()
      }
    }
  }

  const loadUserPermissions = async () => {
    if (user.value?.Roles?.length) {
      const role = user.value.Roles[0]
      if (role?.Permissions?.length) {
        userPermissions.value = role.Permissions.map(p => p.name)
      }
    }
    if (user.value?.roles?.includes('admin')) {
      userPermissions.value = ['*']
    }
  }

  const hasPermission = (permission: string) => {
      return (
          userPermissions.value.includes('*') ||
          userPermissions.value.includes(permission) ||
          user.value?.Roles?.[0]?.name === 'admin' ||
          user.value?.roles?.includes('admin')
      )
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
      console.warn('syncFb failed:', e)
    }
  }

  return {
    user,
    token,
    isLogin,
    isAuthenticated,
    userPermissions,
    isAdmin,
    isGroupManager,
    fbRoles,
    displayName,
    login,
    register,
    logout,
    checkAuth,
    hasPermission,
    syncFb,
  }
})
