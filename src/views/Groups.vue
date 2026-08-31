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
    <div v-else class="card" style="overflow-x:auto">
      <table class="groups-table">
        <thead>
          <tr>
            <th>نام گروه</th>
            <th>توضیحات</th>
            <th>مدیر گروه</th>
            <th>تعداد اعضا</th>
            <th>تاریخ ایجاد</th>
            <th style="width:110px">عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in groups"
            :key="group.id"
            class="group-row"
            :class="{ 'group-row--selected': selectedGroup && selectedGroup.id === group.id }"
            @click="selectGroup(group)"
          >
            <td class="group-name-cell">
              <i class="fas fa-users" style="margin-left:6px;font-size:12px;color:var(--accent)"></i>{{ group.name }}
            </td>
            <td class="group-desc-cell">{{ group.description || '—' }}</td>
            <td>{{ managerName(group) }}</td>
            <td>
              <span class="member-count-badge">{{ group.Users?.length ?? 0 }}</span>
              <button class="btn btn-ghost btn-sm" @click.stop="openMemberModal(group)" title="مدیریت اعضا"><i class="fas fa-user-plus"></i></button>
            </td>
            <td :title="groupCreatedAtRaw(group)">{{ groupCreatedAt(group) }}</td>
            <td>
              <div class="row-actions" @click.stop>
                <button class="btn btn-ghost btn-sm" @click="openGroupModal(group)" title="ویرایش"><i class="fas fa-pen"></i></button>
                <button class="btn btn-ghost btn-sm danger-icon" @click="deleteGroup(group.id)" title="حذف"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- اعضای گروه انتخاب‌شده -->
    <div v-if="selectedGroup" class="card members-panel">
      <div class="members-panel-header">
        <h3 class="card-title">
          <i class="fas fa-users" style="color:var(--accent)"></i> اعضای گروه «{{ selectedGroup.name }}»
          <span class="member-count-badge" style="vertical-align:middle">{{ selectedGroup.Users?.length || 0 }} عضو</span>
        </h3>
        <button class="btn btn-ghost btn-sm" @click="openMemberModal(selectedGroup)">
          <i class="fas fa-user-plus" style="margin-left:4px"></i> افزودن عضو
        </button>
      </div>

      <div v-if="!selectedGroup.Users?.length" class="empty-sm">این گروه عضوی ندارد</div>
      <div v-else class="member-cards">
        <div v-for="u in selectedGroup.Users" :key="u.id" class="member-row" :class="{ 'member-row--manager': isManager(selectedGroup, u) }">
          <div class="member-avatar" :class="{ 'member-avatar--manager': isManager(selectedGroup, u) }">
            <i class="fas fa-crown"></i>
          </div>
          <div class="member-info">
            <span class="member-label" :class="{ 'member-label--manager': isManager(selectedGroup, u) }">
              {{ u.name || u.phone || 'کاربر ناشناس' }}
              <span v-if="isManager(selectedGroup, u)" class="manager-tag">سرگروه</span>
            </span>
            <span v-if="u.phone" class="member-sub" dir="ltr">{{ u.phone }}</span>
            <span class="member-sub" :class="u.is_active === false ? 'member-sub--inactive' : 'member-sub--active'">
              {{ u.is_active === false ? 'غیرفعال' : 'فعال' }}
            </span>
          </div>
          <button class="btn btn-ghost btn-sm member-remove" @click="removeUser(selectedGroup.id, u.id)" title="حذف عضو"><i class="fas fa-times"></i></button>
        </div>
      </div>
    </div>

    <!-- GROUP MODAL -->
    <Transition name="modal">
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
    </Transition>

    <!-- MEMBER MODAL -->
    <Transition name="modal">
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
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import moment from 'moment-jalaali'
import { useAuthStore } from '../stores/auth'
import { useNotify } from '../composables/useNotify'
import { useNotificationsStore } from '../stores/notifications'
import axios from 'axios'

const SERVER = import.meta.env.VITE_SERVER
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const { success, error: toastError, handleError } = useNotify()

const groups = ref([])
const groupUsers = ref([])
const selectedGroup = ref(null)
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
    if (selectedGroup.value) {
      const fresh = groupsWithUsers.find((g) => g.id === selectedGroup.value.id)
      selectedGroup.value = fresh || null
    }
  } catch (e) {
    handleError(e)
  }
}

async function loadGroupUsers(groupId) {
  const r = await axios.get(`${SERVER}/api/groups/${groupId}/users/`)
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
    notifStore.add({
      title: 'عضو جدید',
      message: `${authStore.user?.name || 'مدیر گروه'} کاربری را به گروه «${memberGroup.value.name}» اضافه کرد`,
      type: 'success',
    })
    memberPhone.value = ''
    await loadGroups()
  } catch (e) { handleError(e) }
  finally { savingMembers.value = false }
}

async function removeUser(groupId, userId) {
  if (!confirm('حذف عضو؟')) return
  try { await axios.delete(`${SERVER}/api/groups/${groupId}/users/${userId}`); success('عضو حذف شد'); await loadGroups() } catch (e) { handleError(e) }
}

// ---- Helpers (مدیر گروه + تاریخ ایجاد) ----
function getGroupManagerId(g) {
  return (
    g.manager_id ?? g.created_by ?? g.creator_id ?? g.managed_by ??
    g.owner_id ?? g.user_id ?? g.manager?.id ?? g.Manager?.id ??
    g.creator?.id ?? g.createdBy
  )
}

function managerName(group) {
  const mid = getGroupManagerId(group)
  if (mid == null) return '—'
  const users = group.Users ?? []
  const m = users.find((u) => String(u.id) === String(mid))
  if (m) return m.name || m.phone || '—'
  if (group.Manager) return group.Manager.name || group.Manager.phone || '—'
  if (group.manager) return group.manager.name || group.manager.phone || '—'
  return '—'
}

function selectGroup(group) {
  // اگر روی گروه انتخاب‌شده دوباره کلیک شد، ببند
  if (selectedGroup.value && selectedGroup.value.id === group.id) {
    selectedGroup.value = null
    return
  }
  selectedGroup.value = group
}

function isManager(group, user) {
  const mid = getGroupManagerId(group)
  if (mid == null) return false
  return String(user.id) === String(mid)
}

function rawCreatedAt(group) {
  return group.created_at ?? group.createdAt ?? group.created ?? group.date ?? null
}

function formatDate(raw) {
  if (!raw) return '—'
  try {
    return window.moment
      ? window.moment(raw).format('jYYYY/jMM/jDD')
      : moment(raw).format('jYYYY/jMM/jDD')
  } catch {
    return String(raw).slice(0, 10)
  }
}

function groupCreatedAt(group) {
  const raw = rawCreatedAt(group)
  if (raw == null) return '—'
  return formatDate(raw)
}

function groupCreatedAtRaw(group) {
  const raw = rawCreatedAt(group)
  return raw == null ? '—' : String(raw)
}

onMounted(async () => { await loadGroups(); loading.value = false })
</script>

<style scoped>
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }

.groups-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.groups-table th, .groups-table td { text-align: right; padding: 10px 12px; border-bottom: 1px solid var(--border, rgba(128,128,128,.2)); }
.groups-table thead th { color: var(--text-muted); font-size: 12px; font-weight: 600; white-space: nowrap; }
.groups-table tbody tr:hover { background: var(--surface2); }
.group-name-cell { font-weight: 600; }
.group-desc-cell { color: var(--text-muted); max-width: 220px; word-break: break-word; }
.member-count-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px;
  background: var(--surface2); color: var(--text); font-size: 12px; margin-left: 6px;
}
.row-actions { display: flex; gap: 2px; flex-shrink: 0; }
.danger-icon { color: var(--danger) !important; }

.group-row { cursor: pointer; transition: background 0.15s; }
.group-row:hover { background: var(--surface2); }
.group-row--selected { background: var(--accent-glow); box-shadow: inset 3px 0 0 var(--accent); }

.members-panel { margin-top: 16px; padding: 16px; }
.members-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.member-cards { display: flex; flex-direction: column; gap: 6px; }
.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  transition: background 0.15s;
}
.member-row:hover { background: var(--surface2); }
.member-row--manager {
  background: rgba(232, 132, 60, 0.12);
  border: 1px solid rgba(232, 132, 60, 0.3);
}
.member-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 14px;
}
.member-avatar--manager {
  background: rgba(232, 132, 60, 0.2);
  color: #e8843c;
}
.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.member-label {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.member-label--manager { color: #e8843c; }
.manager-tag {
  background: #e8843c;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.member-sub { font-size: 11px; color: var(--text-muted); }
.member-sub--active { color: var(--success, #22c55e); }
.member-sub--inactive { color: var(--text-muted); }
.member-remove { flex-shrink: 0; }

.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.field-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block; }
.field-error { font-size: 12px; color: var(--danger); }
.field-success { font-size: 12px; color: var(--success, #22c55e); }

@media (max-width: 768px) {
  .groups-table { font-size: 12px; }
  .groups-table th, .groups-table td { padding: 8px 8px; }
}
</style>
