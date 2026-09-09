<template>
  <nav class="admin-topbar" v-if="!isPublicRoute">
    <router-link :to="authStore.isAuthenticated ? '/dashboard' : '/mapbox'" class="topbar-logo">
      <span class="logo-dot"></span>
      <template v-if="route.path === '/mapbox' || route.path === '/login' || route.path === '/register'">Map IQ</template>
      <template v-else-if="authStore.isAdmin">پنل مدیریت</template>
      <template v-else>پنل کاربری</template>
    </router-link>

    <button v-if="authStore.isAuthenticated" class="hamburger" @click="mobileOpen = !mobileOpen" :class="{ open: mobileOpen }" :aria-label="mobileOpen ? 'بستن منو' : 'باز کردن منو'">
      <span></span><span></span><span></span>
    </button>

    <router-link v-else to="/login" class="btn btn-primary btn-sm md:hidden">ورود / ثبت نام</router-link>

    <transition name="fade">
      <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false"></div>
    </transition>

    <div class="topbar-right" :class="{ 'nav-open': mobileOpen }">
      <div v-if="authStore.isAuthenticated" class="topbar-nav">
        <router-link to="/mapbox" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">نقشه</router-link>
        <router-link v-if="authStore.isAdmin" :to="authStore.isMapboxMode ? '/map' : '/mapbox'" class="nav-link" @click="switchMapEngine" :title="authStore.isMapboxMode ? 'رفتن به Cesium' : 'رفتن به Mapbox'">
          <i :class="authStore.isMapboxMode ? 'fas fa-globe' : 'fas fa-map'" class="mr-1"></i>
          {{ authStore.isMapboxMode ? '2D' : '3D' }}
        </router-link>
        <router-link v-if="authStore.isAdmin || authStore.isGroupManager || authStore.isAuthenticated" to="/dashboard" class="nav-link" active-class="nav-link--active" @click="mobileOpen = false">داشبورد</router-link>
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

          <div class="notif-wrap" ref="notifRef">
            <button class="notif-btn" title="اعلان‌ها" @click.stop="toggleNotif">
              <i class="fas fa-bell"></i>
              <span v-if="notifStore.unreadCount" class="notif-badge">{{ notifStore.unreadCount }}</span>
            </button>
            <teleport to="body">
              <div v-if="notifOpen" class="notif-dropdown card" ref="notifDropdownRef" :style="notifStyle" @click.stop>
                <div class="notif-head">
                  <strong>اعلان‌ها</strong>
                  <button class="notif-clear" @click="notifStore.markAllRead">خواندن همه</button>
                </div>
                <div v-if="notifStore.items.length === 0" class="notif-empty">اعلانی ندارید</div>
                <div v-else class="notif-list">
                  <div
                    v-for="n in notifStore.items"
                    :key="n.id"
                    class="notif-item"
                    :class="{ 'notif-unread': !n.read }"
                    @click="notifStore.markRead(n.id)"
                  >
                    <div class="notif-title"><i :class="notifIcon(n.type)"></i>{{ n.title }}</div>
                    <div v-if="n.message" class="notif-msg">{{ n.message }}</div>
                  </div>
                </div>
              </div>
            </teleport>
          </div>

          <div class="user-menu" @click="toggleUserMenu" ref="userMenuRef">
            <span class="user-avatar">{{ initials }}</span>
            <span class="user-name">{{ authStore.displayName }}</span>
          </div>

          <teleport to="body">
            <div v-if="menuOpen" class="user-dropdown card" ref="dropdownRef" :style="dropdownStyle" @click.stop>
              <div class="user-dropdown-info">
                <strong>{{ authStore.displayName }}</strong>
                <span class="user-phone" dir="ltr">{{ authStore.fbUser?.phone || authStore.user?.phone }}</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
                  <span v-for="r in authStore.fbRoles" :key="r" class="badge"
                        :class="r === 'admin' ? 'badge-active' : 'badge-inactive'"
                        style="width:fit-content">{{ roleLabel(r) }}</span>
                </div>
                <div class="wallet-row">
                  <span class="wallet-label"><i class="fas fa-wallet"></i> موجودی:</span>
                  <span class="wallet-amount" dir="ltr">{{ formatMoney(walletBalance) }}</span>
                  <span class="wallet-unit">ریال</span>
                  <button type="button" class="wallet-plus" title="افزایش موجودی" @click.stop="goToCharge">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              <button v-if="!authStore.isAdmin" class="dropdown-item" @click="goToPanel"><i class="fas fa-desktop"></i> پنل کاربری</button>
              <button class="dropdown-item" @click="goToCharge"><i class="fas fa-credit-card"></i> افزایش موجودی</button>
              <button class="dropdown-item" @click="handleLogout"><i class="fas fa-sign-out-alt"></i> خروج از حساب</button>
            </div>
          </teleport>
        </template>

        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-sm">ورود / ثبت نام</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { useNotificationsStore } from "../stores/notifications"
import axios from "axios"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const SERVER = import.meta.env.VITE_SERVER

const menuOpen = ref(false)
const mobileOpen = ref(false)
const userMenuRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})
const walletBalance = ref(0)

// اعلان‌ها
const notifOpen = ref(false)
const notifRef = ref(null)
const notifDropdownRef = ref(null)
const notifStyle = ref({})

function notifIcon(type) {
  return type === "success" ? "fas fa-check-circle notif-ic--success"
    : type === "warning" ? "fas fa-exclamation-triangle notif-ic--warning"
    : type === "error" ? "fas fa-times-circle notif-ic--error"
    : "fas fa-info-circle notif-ic--info"
}

function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    notifRef.value?.getBoundingClientRect()
    const rect = notifRef.value.getBoundingClientRect()
    const width = 300
    const margin = 8
    let right = window.innerWidth - rect.right
    right = Math.max(margin, Math.min(right, window.innerWidth - width - margin))
    let top = rect.bottom + 8
    if (top + 360 > window.innerHeight) top = window.innerHeight - 370
    notifStyle.value = { position: "fixed", width: `${width}px`, right: `${right}px`, top: `${top}px` }
  }
}

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("fa-IR")
}

async function loadWallet() {
  const uid = authStore.user?.id || authStore.fbUser?.id
  if (!uid) {
    walletBalance.value = 0
    return
  }
  try {
    const res = await axios.get(SERVER + "/api/wallet/" + uid, {
      headers: {
        Authorization:
          "Bearer " + (authStore.token || localStorage.getItem("token") || ""),
      },
    })
    walletBalance.value = res.data?.balance ?? res.data?.amount ?? 0
  } catch {
    walletBalance.value = Number(localStorage.getItem("wallet_" + uid) || 0)
  }
}

function goToCharge() {
  menuOpen.value = false
  router.push("/wallet/charge")
}

const isPublicRoute = computed(() => route.meta.public)

const initials = computed(() => {
  const name = authStore.displayName
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?"
})

function roleLabel(r) {
  return r === 'admin' ? 'مدیر سیستم' : r === 'group_manager' ? 'مدیر گروه' : 'کاربر'
}

function positionDropdown() {
  if (!userMenuRef.value) return
  const rect = userMenuRef.value.getBoundingClientRect()
  const width = 220
  const margin = 8
  let right = window.innerWidth - rect.right
  right = Math.max(margin, Math.min(right, window.innerWidth - width - margin))

  let bottom = window.innerHeight - rect.top + 10
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  let style = { position: "fixed", width: `${width}px`, right: `${right}px` }

  if (spaceAbove < 260 && spaceBelow > spaceAbove) {
    style.top = `${rect.bottom + 10}px`
  } else {
    style.bottom = `${bottom}px`
  }

  dropdownStyle.value = style
}

function toggleUserMenu() {
  if (!menuOpen.value) {
    positionDropdown()
    loadWallet()
  }
  menuOpen.value = !menuOpen.value
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

function switchMapEngine() {
  authStore.switchMapEngine()
  const target = authStore.isMapboxMode ? '/mapbox' : '/map'
  router.push(target)
}

function handleClickOutside(e) {
  const inMenu = userMenuRef.value && userMenuRef.value.contains(e.target)
  const inDropdown = dropdownRef.value && dropdownRef.value.contains(e.target)
  if (!inMenu && !inDropdown) {
    menuOpen.value = false
  }
  const inNotif = notifRef.value && notifRef.value.contains(e.target)
  const inNotifDropdown = notifDropdownRef.value && notifDropdownRef.value.contains(e.target)
  if (!inNotif && !inNotifDropdown) {
    notifOpen.value = false
  }
}

function handleReposition() {
  if (menuOpen.value) positionDropdown()
}

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : ""
})

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
  window.addEventListener("resize", handleReposition)
  window.addEventListener("scroll", handleReposition, true)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
  window.removeEventListener("resize", handleReposition)
  window.removeEventListener("scroll", handleReposition, true)
  document.body.style.overflow = ""
})
</script>

<style scoped>
.admin-topbar {
  background: linear-gradient(180deg, rgba(30, 33, 46, 0.92), rgba(19, 21, 30, 0.88));
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
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

.admin-topbar::before {
  content: "";
  position: absolute;
  inset: 0;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: -1;
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
  background: linear-gradient(135deg, var(--brand-2), #d4a24a);
  box-shadow: 0 0 12px var(--brand-glow);
  animation: pulse-dot 2.4s ease-in-out infinite;
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
  transition: color 0.2s var(--ease-out), background-color 0.2s var(--ease-out), transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font);
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface2);
  transform: translateY(-1px);
}

.nav-link--active {
  color: #fff;
  background: linear-gradient(135deg, var(--brand-1), var(--brand-2));
  box-shadow: 0 2px 12px var(--brand-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.gear-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  color: var(--text-muted);
  transition: color 0.2s var(--ease-out), background-color 0.2s var(--ease-out), transform 0.2s var(--ease-out);
  font-size: 16px;
}

.gear-btn:hover {
  color: var(--text);
  background: var(--surface2);
  transform: translateY(-1px);
}

.topbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
  margin-inline-start: auto;
}

.notif-wrap {
  position: relative;
}
.notif-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: color 0.2s var(--ease-out), background-color 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}
.notif-btn:hover {
  color: var(--text);
  background: var(--surface2);
  transform: translateY(-1px);
}
.notif-badge {
  position: absolute;
  top: 3px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger, #ef4444);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.notif-dropdown {
  width: 300px;
  padding: 12px;
  z-index: 300;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  animation: dropdownIn 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
}
.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.notif-clear {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
}
.notif-empty {
  padding: 18px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.notif-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.notif-item {
  padding: 8px 9px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.notif-item:hover {
  background: var(--surface2);
}
.notif-item.notif-unread {
  background: var(--accent-glow);
}
.notif-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.notif-title i {
  font-size: 12px;
}
.notif-ic--success { color: var(--success, #22c55e); }
.notif-ic--warning { color: var(--warning, #f59e0b); }
.notif-ic--error { color: var(--danger, #ef4444); }
.notif-ic--info { color: var(--accent); }
.notif-msg {
  margin-top: 2px;
  color: var(--text-muted);
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
  width: 220px;
  padding: 14px;
  z-index: 300;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  animation: dropdownIn 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
  transform-origin: top left;
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
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

.wallet-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(232, 132, 60, 0.12);
  border: 1px solid rgba(232, 132, 60, 0.25);
  font-size: 11px;
  color: var(--text-muted);
}
.wallet-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.wallet-label i {
  color: #e8843c;
  font-size: 11px;
}
.wallet-amount {
  font-weight: 700;
  color: #e8843c;
  font-size: 12px;
}
.wallet-unit {
  font-size: 10px;
  color: var(--text-muted);
}
.wallet-plus {
  margin-right: auto;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: #e8843c;
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wallet-plus:hover {
  background: #d4732e;
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
  transition: background-color 0.2s var(--ease-out), color 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}

.dropdown-item:hover {
  background: rgba(232, 132, 60, 0.08);
  color: var(--text);
}

.mobile-overlay {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
    height: 100dvh;
    width: 280px;
    max-width: 70vw;
    background: var(--surface);
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
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
}
</style>