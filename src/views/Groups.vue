<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">گروه‌ها</h1>
      <button class="btn btn-primary btn-sm" @click="openGroupModal()">
        <i class="fas fa-plus" style="margin-left:4px"></i> گروه جدید
      </button>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    <div v-else-if="!groups.length" class="empty-state card">
      <p>هنوز گروهی ساخته نشده.</p>
      <button class="btn btn-primary" @click="openGroupModal()" style="margin-top:12px">اولین گروه را بسازید</button>
    </div>
    <div v-else class="items-grid">
      <div v-for="group in groups" :key="group.id" class="item-card card">
        <div class="item-header">
          <div>
            <div class="item-name"><i class="fas fa-users" style="margin-left:6px;font-size:12px;color:var(--accent)"></i>{{ group.name }}</div>
            <div v-if="group.description" class="item-sub">{{ group.description }}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" @click="openGroupModal(group)"><i class="fas fa-pen"></i></button>
            <button class="btn btn-ghost btn-sm danger-icon" @click="deleteGroup(group.id)"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div v-if="group.Users?.length" class="member-list">
          <span v-for="u in group.Users" :key="u.id" class="member-chip" :class="{ 'member-inactive': !u.is_active && u.is_active !== undefined }">
            <span class="member-status-dot" :class="u.is_active ? 'status-active' : 'status-inactive'" :title="u.is_active ? 'فعال' : 'غیرفعال (ورود نکرده)'"></span>
            {{ u.name || u.phone || 'کاربر ناشناس' }}
            <span v-if="u.phone" class="member-phone-tag" dir="ltr">{{ u.phone }}</span>
            <button class="member-rm" @click="removeUser(group.id, u.id)" title="حذف عضو"><i class="fas fa-times"></i></button>
          </span>
        </div>
        <div v-else class="empty-sm">بدون عضو</div>
        <button class="btn btn-ghost btn-sm add-member-btn" @click="openMemberModal(group)">
          <i class="fas fa-user-plus" style="margin-left:4px"></i> افزودن عضو
        </button>
      </div>
    </div>

    <!-- GROUP MODAL -->
    <div v-if="showGroupModal" class="modal-backdrop" @click.self="closeGroupModal">
      <div class="modal card">
        <h2 class="modal-title">{{ editingGroup ? 'ویرایش گروه' : 'گروه جدید' }}</h2>
        <form @submit.prevent="saveGroup" class="modal-form">
          <div class="form-row"><label>نام گروه</label><input v-model="groupForm.name" class="input" required /></div>
          <div class="form-row"><label>توضیحات</label><input v-model="groupForm.description" class="input" /></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeGroupModal">انصراف</button>
            <button type="submit" class="btn btn-primary" :disabled="savingGroup">{{ savingGroup ? 'در حال ذخیره...' : (editingGroup ? 'بروزرسانی' : 'ایجاد') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MEMBER MODAL -->
    <div v-if="showMemberModal" class="modal-backdrop" @click.self="closeMemberModal">
      <div class="modal card">
        <h2 class="modal-title">افزودن عضو به «{{ memberGroup?.name }}»</h2>
        <div class="modal-form">
          <div class="form-row">
            <label>شماره تماس کاربر</label>
            <input
              v-model="memberPhone"
              class="input"
              placeholder="09123456789"
              dir="ltr"
              @keyup.enter="addMemberByPhone"
              @input="formatPhoneInput"
              maxlength="11"
              inputmode="numeric"
              pattern="09\d{9}"
              title="شماره موبایل ۱۱ رقمی با پیشوند ۰۹"
            />
            <span class="field-hint">کاربر تا زمان اولین ورود غیرفعال نمایش داده می‌شود</span>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:12px">
          <button class="btn btn-ghost" @click="closeMemberModal">بستن</button>
          <button class="btn btn-primary" @click="addMemberByPhone" :disabled="savingMembers || !memberPhone.trim()">{{ savingMembers ? 'در حال افزودن...' : 'افزودن' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useNotify } from '../composables/useNotify'
import axios from 'axios'

const SERVER = import.meta.env.VITE_SERVER
const authStore = useAuthStore()
const { success, error: toastError, handleError } = useNotify()

const groups = ref([])
const groupUsers = ref([])
const loading = ref(true)
const showGroupModal = ref(false)
const editingGroup = ref(null)
const groupForm = ref({ name: '', description: '' })
const savingGroup = ref(false)

async function loadGroups() {
  try {
    const r = await axios.get(`${SERVER}/api/groups`)
    const data = Array.isArray(r.data.data || r.data)
        ? (r.data.data || r.data)
        : []

    // دریافت کاربران هر گروه بر اساس id
    const groupsWithUsers = await Promise.all(
        data.map(async (group) => {
          const users = await loadGroupUsers(group.id)
          return {
            ...group,
            Users: users
          }
        })
    )

    groups.value = groupsWithUsers
  } catch (e) {
    handleError(e)
  }
}

async function loadGroupUsers(groupId) {
  const r = await axios.get(`${SERVER}/api/groups/${groupId}/users/`)
  console.log(groupId, r.data)
  return r.data.data || r.data
}

function openGroupModal(group = null) {
  editingGroup.value = group
  groupForm.value = group ? { name: group.name, description: group.description || '' } : { name: '', description: '' }
  showGroupModal.value = true
}

function closeGroupModal() { showGroupModal.value = false; editingGroup.value = null }

async function saveGroup() {
  savingGroup.value = true
  try {
    if (editingGroup.value) await axios.put(`${SERVER}/api/groups/${editingGroup.value.id}`, groupForm.value)
    else await axios.post(SERVER + '/api/groups', groupForm.value)
    success(editingGroup.value ? 'گروه بروزرسانی شد' : 'گروه جدید ایجاد شد')
    await loadGroups(); closeGroupModal()
  } catch (e) { handleError(e) }
  finally { savingGroup.value = false }
}

async function deleteGroup(id) {
  if (!confirm('گروه حذف شود؟')) return
  try { await axios.delete(`${SERVER}/api/groups/${id}`); success('گروه حذف شد'); await loadGroups() } catch (e) { handleError(e) }
}

// ---- Members ----
const showMemberModal = ref(false)
const memberGroup = ref(null)
const memberPhone = ref('')
const savingMembers = ref(false)

function openMemberModal(group) {
  memberGroup.value = group
  memberPhone.value = ''
  showMemberModal.value = true
}

function closeMemberModal() { showMemberModal.value = false; memberGroup.value = null }

function formatPhoneInput(e) {
  let value = e.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.slice(0, 11)
  e.target.value = value
  memberPhone.value = value
}

async function addMemberByPhone() {
  const phone = memberPhone.value.trim()
  if (!phone) return
  if (!/^09\d{9}$/.test(phone)) {
    toastError('شماره موبایل باید ۱۱ رقم و با پیشوند ۰۹ باشد')
    return
  }
  savingMembers.value = true
  try {
    //await axios.post(`${SERVER}/api/groups/${memberGroup.value.id}/users/phone`, { phone: memberPhone.value.trim() })
    await axios.post(`${SERVER}/api/groups/join-group`, { phone: memberPhone.value.trim(),groupId: memberGroup.value.id })
    success('کاربر با موفقیت اضافه شد')
    memberPhone.value = ''
    await loadGroups()
  } catch (e) { handleError(e) }
  finally { savingMembers.value = false }
}

async function removeUser(groupId, userId) {
  if (!confirm('حذف عضو؟')) return
  try { await axios.delete(`${SERVER}/api/groups/${groupId}/users/${userId}`); success('عضو حذف شد'); await loadGroups() } catch (e) { handleError(e) }
}

onMounted(async () => { await loadGroups(); loading.value = false })
</script>

<style scoped>
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.item-card { padding: 16px; display: flex; flex-direction: column; }
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
.item-name { font-size: 14px; font-weight: 600; word-break: break-word; }
.item-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.row-actions { display: flex; gap: 2px; flex-shrink: 0; }
.danger-icon { color: var(--danger) !important; }
.empty-sm { font-size: 12px; color: var(--text-muted); }
.add-member-btn { margin-top: 8px; width: 100%; }

.member-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.member-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--surface2); padding: 4px 10px; border-radius: 14px; font-size: 12px;
}
.member-chip.member-inactive { opacity: .65; }
.member-status-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.status-active { background: var(--success, #22c55e); }
.status-inactive { background: var(--text-muted); }
.member-phone-tag {
  font-size: 10px; color: var(--text-muted); background: rgba(255,255,255,.06);
  padding: 1px 5px; border-radius: 6px;
}
.member-rm { background: none; border: none; cursor: pointer; color: var(--danger); font-size: 10px; padding: 0; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { width: 100%; max-width: 420px; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; word-break: break-word; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.field-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block; }
.field-error { font-size: 12px; color: var(--danger); }
.field-success { font-size: 12px; color: var(--success, #22c55e); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

@media (max-width: 768px) {
  .items-grid { grid-template-columns: 1fr; }
  .member-chip { font-size: 11px; padding: 3px 8px; }
}
@media (max-width: 480px) {
  .item-card { padding: 12px; }
  .item-name { font-size: 13px; }
}
</style>
