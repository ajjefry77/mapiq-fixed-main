import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import axios from 'axios';

import { EV, logger } from '../logger';
import {
  clearAllSensitiveData,
  isSessionValid,
  sanitizeInput,
  setupTokenRefresh,
  trackActivity,
} from '../utils/security';

const API_BASE_URL = `${import.meta.env.VITE_SERVER ?? ''}/api`;
const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  mapEngine: 'mapEngine',
  fbToken: 'fb_token',
} as const;

interface UserRole {
  id: string | number;
  name: string;
  Permissions?: Array<{ name: string }>;
}

interface UserData {
  id: string | number | null;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  phone?: string | null;
  code?: string | null;
  Roles?: UserRole[];
  roles?: string[];
}

function readStoredUser(): UserData | null {
  const rawValue = localStorage.getItem(STORAGE_KEYS.user);

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as UserData;
    return parsed && typeof parsed === 'object' ? parsed : { id: rawValue };
  } catch {
    return { id: rawValue };
  }
}

function setAuthHeader(authToken: string | null): void {
  if (authToken) {
    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    return;
  }

  delete axios.defaults.headers.common.Authorization;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(readStoredUser());
  const isLogin = ref(false);
  const isMapboxMode = ref(localStorage.getItem(STORAGE_KEYS.mapEngine) === 'mapbox');
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.token));
  const userPermissions = ref<string[]>([]);
  const fbRoles = ref<string[]>([]);
  let authCheckPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => {
    if (!token.value || !user.value) {
      return false;
    }

    return isSessionValid();
  });

  const isAdmin = computed(() => {
    if (user.value?.Roles?.some((role) => role.name === 'admin')) return true;
    return user.value?.roles?.some((role) => role === 'admin') ?? false;
  });

  const isGroupManager = computed(() => {
    if (user.value?.Roles?.some((role) => role.name === 'group_manager')) return true;
    return user.value?.roles?.some((role) => role === 'group_manager') ?? false;
  });

  const isUser = computed(() => !isAdmin.value && !isGroupManager.value);
  const displayName = computed(() => user.value?.name || user.value?.username || '');

  function setAuthData(authToken: string, userData: UserData): void {
    token.value = authToken;
    user.value = userData;
    isLogin.value = true;
    authCheckPromise = Promise.resolve();

    localStorage.setItem(STORAGE_KEYS.token, authToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));

    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    trackActivity();
    setupTokenRefresh(
      () => token.value,
      async () => {
        await checkAuth();
        return !!token.value;
      }
    );
  }

  function clearAuthData(): void {
    token.value = null;
    user.value = null;
    isLogin.value = false;
    userPermissions.value = [];
    authCheckPromise = null;
    clearAllSensitiveData();
    setAuthHeader(null);
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const sanitizedUsername = sanitizeInput(username);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: sanitizedUsername,
        password,
      });
      const { token: authToken, user: userData } = response.data;

      if (!authToken || !userData) {
        throw new Error('پاسخ سرور نامعتبر');
      }

      setAuthData(authToken, userData);
      await loadUserPermissions();

      logger.info(EV.AUTH_LOGIN_SUCCESS, {
        userId: String(userData.id ?? ''),
        role: Array.isArray(userData.roles) ? userData.roles.join(',') : undefined,
      });

      return { success: true };
    } catch (error: any) {
      logger.warn(
        EV.AUTH_LOGIN_FAILED,
        {
          status: error?.response?.status,
          username: sanitizedUsername,
        },
        error
      );

      return {
        success: false,
        error: error.response?.data?.error || 'خطای احراز هویت.',
      };
    }
  }

  async function register(userData: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitizedData: Record<string, any> = {};

      Object.entries(userData).forEach(([key, value]) => {
        sanitizedData[key] = typeof value === 'string' ? sanitizeInput(value) : value;
      });

      const response = await axios.post(`${API_BASE_URL}/register`, sanitizedData);
      const { token: authToken, user: userInfo } = response.data;

      if (!authToken || !userInfo) {
        throw new Error('پاسخ سرور نامعتبر');
      }

      setAuthData(authToken, userInfo);
      logger.info(EV.AUTH_REGISTER_SUCCESS, { userId: String(userInfo.id ?? '') });
      return { success: true };
    } catch (error: any) {
      logger.warn(EV.AUTH_REGISTER_FAILED, { status: error?.response?.status }, error);
      return {
        success: false,
        error: error.response?.data?.error || 'خطای ثبت نام',
      };
    }
  }

  function logout(): void {
    logger.info(EV.AUTH_LOGOUT, { userId: String(user.value?.id ?? '') });
    clearAuthData();
  }

  async function checkAuth(): Promise<void> {
    if (!token.value) {
      return;
    }

    if (!isSessionValid()) {
      clearAuthData();
      return;
    }

    if (authCheckPromise) {
      return authCheckPromise;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token.value}`;

    authCheckPromise = (async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/${user.value?.id || 'me'}`);

        if (!response.data) {
          throw new Error('پاسخ خالی از سرور');
        }

        const userData = response.data;
        if (!userData.id && !userData.Roles && !userData.roles) {
          throw new Error('داده‌های کاربر نامعتبر');
        }

        user.value = userData;
        await loadUserPermissions();
        trackActivity();
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuthData();
        }
      }
    })();

    await authCheckPromise;
    authCheckPromise = null;
  }

  async function loadUserPermissions(): Promise<void> {
    const perms = new Set<string>();

    user.value?.Roles?.forEach((role) => {
      role.Permissions?.forEach((permission) => {
        perms.add(permission.name);
      });
    });

    if (user.value?.roles?.includes('admin')) {
      perms.add('*');
    }

    if (user.value?.roles?.includes('group_manager')) {
      ['view_groups', 'manage_groups', 'view_forms', 'manage_forms'].forEach((permission) => perms.add(permission));
    }

    userPermissions.value = [...perms];
  }

  function hasPermission(permission: string): boolean {
    if (!isAuthenticated.value) return false;
    if (userPermissions.value.includes('*')) return true;
    if (userPermissions.value.includes(permission)) return true;
    if (isAdmin.value) return true;
    if (isGroupManager.value) {
      const groupManagerPermissions = ['view_groups', 'manage_groups', 'view_forms', 'manage_forms'];
      return groupManagerPermissions.includes(permission);
    }
    return false;
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => hasPermission(permission));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => hasPermission(permission));
  }

  function isRole(roleName: string): boolean {
    return user.value?.Roles?.some((role) => role.name === roleName) ??
      user.value?.roles?.some((role) => role === roleName) ??
      false;
  }

  async function syncFb(): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/sync/login`, {
        phone: user.value?.phone,
        full_name: user.value?.name || user.value?.full_name,
      });
      const data = response.data;

      if (data.success) {
        fbRoles.value = data.data.user.roles || [];
        localStorage.setItem('fb_token', data.data.token);
        return data.data;
      }
    } catch (error: any) {
      logger.warn(EV.AUTH_SYNC_FB_FAILED, {
        status: error?.response?.status,
      }, error);
    }
  }

  function switchMapEngine(): void {
    isMapboxMode.value = !isMapboxMode.value;
    localStorage.setItem('mapEngine', isMapboxMode.value ? 'mapbox' : 'cesium');
  }

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
  };
});
