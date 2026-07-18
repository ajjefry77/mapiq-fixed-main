<template>
  <nav class="admin-topbar" v-if="!isPublicRoute">
    <router-link :to="authStore.isAuthenticated ? '/dashboard' : '/map'" class="topbar-logo">
      <span class="logo-dot"></span>
      <template v-if="route.path === '/map' || route.path === '/login' || route.path === '/register'">Map IQ</template>
      <template v-else-if="authStore.isAdmin">پنل مدیریت</template>
      <template v-else>پنل کاربری</template>
    </router-link>

    <button v-if="authStore.isAuthenticated" class="hamburger" @click="mobileOpen = !mobileOpen" :class="{ open: mobileOpen }">
      <span></span><span></span><span></span>
    </button>

    <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false"></div>

    <div class="topbar-right" :class="{ 'nav-open': mobileOpen }">
      <div v-if="authStore.isAuthenticated" class="topbar-nav">
        <router-link to="/map" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">نقشه</router-link>
        <router-link v-if="authStore.isAdmin || authStore.isGroupManager" to="/dashboard" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">داشبورد</router-link>
        <router-link v-if="authStore.isAdmin && authStore.hasPermission('view_users')" to="/users" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">کاربران</router-link>
        <router-link v-if="authStore.isAdmin && authStore.hasPermission('view_roles')" to="/roles" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">نقش‌ها</router-link>
        <router-link v-if="authStore.isAdmin || authStore.isAuthenticated && authStore.isGroupManager" to="/groups" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">گروه‌ها</router-link>
        <router-link v-if="authStore.isAdmin || authStore.isGroupManager" to="/forms" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">فرم‌ها</router-link>
      </div>

      <div class="topbar-actions">
        <template v-if="authStore.isAuthenticated">
          <router-link v-if="authStore.isAdmin" to="/setting" class="gear-btn" title="تنظیمات">
            <i class="fas fa-cog"></i>
          </router-link>

          <div class="user-menu" @click="menuOpen = !menuOpen" ref="userMenuRef">
            <span class="user-avatar">{{ initials }}</span>
            <span class="user-name">{{ authStore.displayName }}</span>
            <div v-if="menuOpen" class="user-dropdown card">
              <div class="user-dropdown-info">
                <strong>{{ authStore.displayName }}</strong>
                <span class="user-phone" dir="ltr">{{ authStore.fbUser?.phone || authStore.user?.phone }}</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
                  <span v-for="r in authStore.fbRoles" :key="r" class="badge"
                        :class="r === 'admin' ? 'badge-active' : 'badge-inactive'"
                        style="width:fit-content">{{ roleLabel(r) }}</span>
                </div>
              </div>
              <button v-if="!authStore.isAdmin" class="dropdown-item" @click="goToPanel">🖥 پنل کاربری</button>
              <button class="dropdown-item" @click="handleLogout">🚪 خروج از حساب</button>
            </div>
          </div>
        </template>

        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-sm">ورود / ثبت نام</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuOpen = ref(false)
const mobileOpen = ref(false)
const userMenuRef = ref(null)

const isPublicRoute = computed(() => route.meta.public)

const initials = computed(() => {
  const name = authStore.displayName
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?"
})

function roleLabel(r) {
  return r === 'admin' ? 'مدیر سیستم' : r === 'group_manager' ? 'مدیر گروه' : 'کاربر'
}

function goToPanel() {
  menuOpen.value = false
  router.push("/dashboard")
}

function handleLogout() {
  authStore.logout()
  menuOpen.value = false
  router.push("/login")
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
})
</script>

<style scoped>
.admin-topbar {
  background: rgba(26, 29, 39, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  direction: rtl;
}

.topbar-logo {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.logo-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #d4a24a);
  box-shadow: 0 0 12px var(--accent-glow);
}

.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  padding: 8px 7px;
  flex-shrink: 0;
  transition: all .2s;
}
.hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--text-muted);
  border-radius: 2px;
  transition: all .25s;
}
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: space-between;
}

.topbar-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 7px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font);
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface2);
}

.nav-link--active {
  color: var(--accent);
  background: var(--accent-glow);
}

.gear-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  color: var(--text-muted);
  transition: all 0.15s;
  font-size: 16px;
}

.gear-btn:hover {
  color: var(--text);
  background: var(--surface2);
}

.topbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
  margin-inline-start: auto;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: var(--radius);
  transition: background 0.15s;
}

.user-menu:hover {
  background: var(--surface2);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-dim));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-name {
  font-size: 13px;
  color: var(--text);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 220px;
  padding: 14px;
  z-index: 200;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}

.user-dropdown-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.user-phone {
  font-size: 12px;
  color: var(--text-muted);
}

.dropdown-item {
  width: 100%;
  text-align: right;
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: var(--font);
  font-size: 13px;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(232, 132, 60, 0.08);
  color: var(--text);
}

.mobile-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 199;
  }

  .admin-topbar {
    padding: 0 14px;
  }

  .hamburger {
    display: flex;
  }

  .topbar-right {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 70vw;
    background: var(--surface);
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
  }
  .topbar-right.nav-open {
    transform: translateX(0);
  }

  .topbar-nav {
    flex-direction: column;
    gap: 4px;
    flex: unset;
  }

  .nav-link {
    padding: 12px 16px;
    font-size: 15px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface2);
  }
  .nav-link--active {
    background: var(--accent-glow);
    border-color: var(--accent);
  }

  .topbar-actions {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    justify-content: space-between;
  }

  .user-name {
    display: none;
  }

  .user-dropdown {
    position: fixed;
    bottom: calc(100% - 60px);
    left: 16px;
    right: 16px;
    top: auto;
    width: auto;
  }
}
</style>