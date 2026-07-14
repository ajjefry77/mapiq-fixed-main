<!-- this a test -->
<template>
  <div class="page">
    <div v-if="isAdmin">
      <div class="db-header">
        <div>
          <h1 class="db-title">داشبورد</h1>
          <p class="db-sub">خوش آمدید، {{ authStore.user?.name }}</p>
        </div>
        <span class="badge badge-active">{{ roleLabel }}</span>
      </div>

      <div class="info-row">
        <div class="info-item">
          <span class="info-label">نام</span>
          <span class="info-value">{{ authStore.user?.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تلفن</span>
          <span class="info-value" dir="ltr">{{ authStore.user?.phone }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">نام کاربری</span>
          <span class="info-value">{{ authStore.user?.username }}</span>
        </div>
      </div>

      <div class="shortcuts">
        <div v-if="authStore.hasPermission('view_users')" class="shortcut" @click="$router.push('/users')">
          <i class="fas fa-users"></i>
          <span>کاربران</span>
        </div>
        <div v-if="authStore.hasPermission('view_roles')" class="shortcut" @click="$router.push('/roles')">
          <i class="fas fa-user-tag"></i>
          <span>نقش‌ها</span>
        </div>
        <div class="shortcut" @click="$router.push('/forms')">
          <i class="fas fa-file-alt"></i>
          <span>فرم‌ها</span>
        </div>
        <div class="shortcut" @click="$router.push('/setting')">
          <i class="fas fa-cog"></i>
          <span>تنظیمات</span>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="db-header">
        <div>
          <h1 class="db-title">پنل کاربری</h1>
          <p class="db-sub">خوش آمدید، {{ authStore.user?.name }}</p>
        </div>
        <span class="badge badge-active">{{ roleLabel }}</span>
      </div>

      <div class="profile-grid">
        <div class="card profile-card">
          <h3 class="card-title"><i class="fas fa-user-edit"></i> ویرایش اطلاعات</h3>
          <div class="profile-form">
            <div class="form-row">
              <label>نام</label>
              <input v-model="profileForm.name" class="input" />
            </div>
            <div class="form-row">
              <label>تلفن</label>
              <input v-model="profileForm.phone" class="input" dir="ltr" />
            </div>
            <div class="form-row">
              <label>کد ملی</label>
              <input v-model="profileForm.code" class="input" dir="ltr" />
            </div>
            <div class="form-row">
              <label>رمز عبور جدید</label>
              <input v-model="profileForm.password" type="password" class="input" placeholder="اختیاری" />
            </div>
            <button class="btn btn-primary" @click="updateProfile" :disabled="saving">
              {{ saving ? 'در حال ذخیره...' : 'ذخیره' }}
            </button>
            <p v-if="profileMsg" class="msg" :class="profileMsgType === 'success' ? 'msg-ok' : 'msg-err'">{{ profileMsg }}</p>
          </div>
        </div>

        <div class="side-stack">
          <div class="card mini-card">
            <h3 class="card-title"><i class="fas fa-file-alt"></i> فرم‌های من</h3>
            <div v-if="forms.length === 0" class="empty-sm">فرمی اختصاص ندارد</div>
            <div v-else class="mini-list">
              <div v-for="f in forms" :key="f.id" class="mini-item" @click="$router.push('/f/' + f.id)">
                <span>{{ f.title || 'بدون عنوان' }}</span>
                <i class="fas fa-chevron-left"></i>
              </div>
            </div>
          </div>
          <div class="card mini-card">
            <h3 class="card-title"><i class="fas fa-users"></i> گروه‌های من</h3>
            <div v-if="groups.length === 0" class="empty-sm">عضو گروهی نیستید</div>
            <div v-else class="tag-list">
              <span v-for="g in groups" :key="g.id" class="tag">{{ g.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';

const authStore = useAuthStore();
const SERVER = import.meta.env.VITE_SERVER;

const isAdmin = computed(() =>
  authStore.user?.roles?.includes('admin') ||
  authStore.user?.Roles?.[0]?.name === 'admin'
)

const roleLabel = computed(() => {
  if (authStore.user?.roles?.includes('admin') || authStore.user?.Roles?.[0]?.name === 'admin') return 'مدیر سیستم'
  if (authStore.user?.roles?.includes('group_manager')) return 'مدیر گروه'
  return 'کاربر'
})

const forms = ref([])
const groups = ref([])
const saving = ref(false)
const profileMsg = ref('')
const profileMsgType = ref('success')
const profileForm = reactive({ name: '', phone: '', code: '', password: '' })

async function loadProfile() {
  profileForm.name = authStore.user?.name || ''
  profileForm.phone = authStore.user?.phone || ''
  profileForm.code = authStore.user?.code || ''
  profileForm.password = ''
}

async function loadMyData() {
  if (isAdmin.value) return
  try {
    const [formsRes, groupsRes] = await Promise.all([
      axios.get(SERVER + '/api/forms'),
      axios.get(SERVER + '/api/auth/me')
    ])
    forms.value = Array.isArray(formsRes.data) ? formsRes.data : formsRes.data?.data || []
    const me = groupsRes.data?.data || groupsRes.data
    if (me?.group_ids?.length) {
      const gRes = await axios.get(SERVER + '/api/groups')
      const allGroups = Array.isArray(gRes.data) ? gRes.data : gRes.data?.data || []
      groups.value = allGroups.filter(g => me.group_ids.includes(g.id))
    }
  } catch (e) { console.error(e) }
}

async function updateProfile() {
  saving.value = true; profileMsg.value = ''
  try {
    const body = { full_name: profileForm.name, phone: profileForm.phone, code: profileForm.code || undefined }
    if (profileForm.password) body.password = profileForm.password
    await axios.put(SERVER + '/api/users/me', body)
    if (authStore.user) {
      authStore.user.name = profileForm.name
      authStore.user.phone = profileForm.phone
      authStore.user.code = profileForm.code
    }
    profileMsg.value = 'ذخیره شد'; profileMsgType.value = 'success'
  } catch (e) {
    profileMsg.value = e.response?.data?.error || 'خطا'; profileMsgType.value = 'error'
  } finally { saving.value = false }
}

onMounted(() => { loadProfile(); loadMyData() })
</script>

<style scoped>
.db-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.db-title { font-size: 20px; font-weight: 700; }
.db-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.info-row { display: flex; gap: 16px; margin-bottom: 24px; }
.info-item { flex: 1; background: var(--surface2); border-radius: var(--radius); padding: 12px 16px; }
.info-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.info-value { font-size: 14px; font-weight: 500; }

.shortcuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.shortcut { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: all .15s; font-size: 13px; color: var(--text-muted); }
.shortcut i { font-size: 20px; color: var(--accent); }
.shortcut:hover { border-color: var(--accent); color: var(--text); transform: translateY(-1px); }

.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.profile-card { padding: 20px; }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--text); }
.card-title i { color: var(--accent); font-size: 13px; }

.profile-form { display: flex; flex-direction: column; gap: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.msg { font-size: 12px; margin-top: 4px; }
.msg-ok { color: var(--success); }
.msg-err { color: var(--danger); }

.side-stack { display: flex; flex-direction: column; gap: 16px; }
.mini-card { padding: 16px; }
.empty-sm { font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px 0; }
.mini-list { display: flex; flex-direction: column; gap: 2px; max-height: 200px; overflow-y: auto; }
.mini-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: background .12s; }
.mini-item:hover { background: var(--surface2); }
.mini-item i { font-size: 10px; color: var(--text-muted); }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: var(--accent-glow); color: var(--accent); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }

@media (max-width: 768px) {
  .db-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .info-row { flex-direction: column; gap: 8px; }
  .shortcuts { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .shortcut { padding: 16px 12px; font-size: 12px; }
  .shortcut i { font-size: 18px; }
  .profile-grid { grid-template-columns: 1fr; gap: 12px; }
  .profile-card, .mini-card { padding: 16px; }
}
@media (max-width: 400px) {
  .shortcuts { grid-template-columns: 1fr; }
  .db-title { font-size: 17px; }
}
</style>
