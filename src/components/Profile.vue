<!--'x-api-key': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1In0.eyJhdWQiOiIyNjc3NSIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1IiwiaWF0IjoxNzExNTIxNTM0LCJuYmYiOjE3MTE1MjE1MzQsImV4cCI6MTcxNDExMzUzNCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.fi9nJpTLqS0UqeRHKx1rtd0H_Eg7Q67WA7RuGOl6ZegLggD3d7Q84G9sxFiRbfbPBcnLQulwnTvAlrjF8RhSW2hwB4L4I5IY3fpn4mRlIH4KqBMbLmhKHpUuqA6E9oGLqnOcIz-f3vTMEZEFf5_eYWnglebM18y-mBgPO6jIfgfTUnvaegSXKYFnV5HaZRMbIOynXLpP9VdCA9Wf5cIqS9nrwN-gufTMyC39T-1MaFIJyFF4bF1OLHdHLzdQ0Pwf5rZ7Z07i9kLhpMMP_84C3_2BHfY6vzwkvMcJNkwjOEbP84mv56pNxJ2ZZv7qxlJ_WghUBHNNaA_Cctpi-7CmSA'-->
<template>
  <div>
    <button
      @click="togglePanel"
      class="profile-btn"
      :class="authStore.user ? 'profile-btn--active' : 'profile-btn--login'"
      :title="authStore.user ? 'مشخصات کاربری' : 'ورود'">
      <i class="fas fa-user"></i>
      <span v-if="!authStore.user" class="profile-btn-label">ورود</span>
    </button>

    <transition
      enter-active-class="slide-enter-active"
      enter-from-class="slide-enter-from"
      leave-active-class="slide-leave-active"
      leave-to-class="slide-leave-to">

      <div v-if="isOpen" class="panel-overlay" @click="closePanel">
        <div class="panel-card" dir="rtl" @click.stop>

          <div class="panel-header">
            <div class="panel-header-info">
              <span class="panel-avatar">{{ initials }}</span>
              <div>
                <div class="panel-name">{{ authStore.user?.name || 'کاربر' }}</div>
                <div class="panel-phone" dir="ltr">{{ authStore.user?.phone }}</div>
              </div>
            </div>
            <button @click="closePanel" class="panel-close" title="بستن">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="saveUser">
            <div class="panel-form">
              <div>
                <label class="panel-label">نام و نام خانوادگی</label>
                <input v-model="userForm.name" type="text" required class="input" />
              </div>

              <div>
                <label class="panel-label">موبایل</label>
                <input v-model="authStore.user.phone" type="tel" required class="input" dir="ltr" />
              </div>

              <div>
                <label class="panel-label">نام کاربری</label>
                <input v-model="authStore.user.username" type="text" required class="input" dir="ltr" />
              </div>

              <div>
                <label class="panel-label">رمز عبور</label>
                <input v-model="userForm.password" type="password" required class="input" />
              </div>
              <div>
                <label class="panel-label">تکرار رمز عبور</label>
                <input v-model="userForm.re_password" type="password" required class="input" />
              </div>
            </div>

            <div class="panel-actions">
              <button type="submit" class="btn btn-primary btn-sm">
                ثبت تغییرات
              </button>
            </div>

            <div class="panel-footer">
              <button type="button" @click="goToFormBuilder" class="btn btn-secondary btn-sm w-full">
                ورود به پنل مدیریت
              </button>
              <button type="button" @click="logout" class="btn btn-danger btn-sm w-full">
                خروج از حساب کاربری
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useToast } from "vue-toast-notification";
import { useAuthStore } from '../stores/auth';
import axios from "axios";
import { useRouter } from 'vue-router'

const $toast = useToast();
const authStore = useAuthStore();
const SERVER = import.meta.env.VITE_SERVER
const router = useRouter()

const emit = defineEmits(['location-selected'])

const isOpen = ref(false)

const initials = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return '?'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
})

const userForm = reactive({
  name: authStore.user?.name,
  password: '',
  re_password: ''
});

const saveUser = async () => {
  try {
    if (userForm.password == userForm.re_password) {
      await axios.put(
        SERVER + `/api/users/${authStore.user.id}`,
        userForm
      );
      showMessage('تغییرات ثبت شد', 'success')
    } else {
      showMessage('پسورد و تکرارش مغایرت دارد', 'error')
    }
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

const goToFormBuilder = async () => {
  isOpen.value = false;
  await authStore.syncFb()
  router.push('/forms')
}

const logout = async () => {
  isOpen.value = false;
  authStore.logout()
  router.push('/login');
}

const togglePanel = () => {
  if (authStore.user)
    isOpen.value = !isOpen.value
  else
    router.push('/login');
}

const closePanel = () => {
  isOpen.value = false
}

function showMessage(msg, type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000
  });
}
</script>

<style scoped>
.profile-btn {
  position: absolute;
  top: 15px;
  left: 11px;
  height: 36px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: var(--shadow-md);
  font-size: 13px;
  cursor: pointer;
  z-index: 90;
  border: 1px solid var(--border);
  transition: all var(--transition-fast);
  background: var(--surface);
  color: var(--text-muted);
}

.profile-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.profile-btn--active {
  width: 36px;
}

.profile-btn--login {
  width: 64px;
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.profile-btn--login:hover {
  color: #fff;
  filter: brightness(1.08);
}

.profile-btn-label {
  font-size: 11px;
  font-weight: 600;
}

.slide-enter-active {
  transition: transform 0.3s ease-out;
}
.slide-enter-from {
  transform: translateX(-340px);
}
.slide-leave-active {
  transition: transform 0.3s ease-in;
}
.slide-leave-to {
  transform: translateX(-340px);
}

.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.panel-card {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 340px;
  max-width: 90vw;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  z-index: 1001;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

.panel-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.panel-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-dim));
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.panel-phone {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  direction: ltr;
  text-align: left;
}

.panel-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.panel-close:hover {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-glow);
}

.panel-form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.panel-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.panel-actions {
  padding: 0 20px 12px;
  display: flex;
  justify-content: flex-end;
}

.panel-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-elevated);
}
</style>
