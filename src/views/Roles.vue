<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">نقش‌ها</h1>
      <button class="btn btn-primary btn-sm" @click="openModal()">
        <i class="fas fa-plus" style="margin-left:4px"></i> نقش جدید
      </button>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    <div v-else-if="!roles.length" class="empty-state card">هنوز نقشی تعریف نشده.</div>
    <div v-else class="items-grid">
      <div v-for="role in roles" :key="role.id" class="item-card card">
        <div class="item-header">
          <div>
            <div class="item-name">{{ role.description }}</div>
            <div class="item-sub">{{ role.name }}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" @click="openModal(role)"><i class="fas fa-pen"></i></button>
            <button class="btn btn-ghost btn-sm danger-icon" @click="deleteRole(role)" :disabled="role.name === 'admin'"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div v-if="role.Permissions?.length" class="perm-tags">
          <span v-for="rp in role.Permissions" :key="rp.id" class="tag">{{ rp.description }}</span>
        </div>
        <div v-else class="empty-sm">بدون دسترسی</div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal card">
        <h2 class="modal-title">{{ editing ? 'ویرایش نقش' : 'نقش جدید' }}</h2>
        <form @submit.prevent="save" class="modal-form">
          <div class="form-row"><label>نام</label><input v-model="form.name" class="input" required /></div>
          <div class="form-row"><label>توضیحات</label><input v-model="form.description" class="input" required /></div>
          <div class="form-row">
            <label>دسترسی‌ها</label>
            <div class="perm-checklist">
              <label v-for="p in permissions" :key="p.id" class="check-row">
                <input type="checkbox" :value="p.id" v-model="form.permissions" />
                <span>{{ p.description }}</span>
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeModal">انصراف</button>
            <button type="submit" class="btn btn-primary">{{ editing ? 'بروزرسانی' : 'ایجاد' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const SERVER = import.meta.env.VITE_SERVER
const authStore = useAuthStore()

const roles = ref([])
const permissions = ref([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', description: '', permissions: [] })

async function loadRoles() {
  try { const r = await axios.get(SERVER + '/api/roles'); roles.value = Array.isArray(r.data.data || r.data) ? (r.data.data || r.data) : [] } catch (e) { console.error(e) }
}
async function loadPermissions() {
  try { const r = await axios.get(SERVER + '/api/permissions'); permissions.value = Array.isArray(r.data.data || r.data) ? (r.data.data || r.data) : [] } catch (e) { console.error(e) }
}
function openModal(role = null) {
  editing.value = role
  form.value = role ? { name: role.name, description: role.description, permissions: role.Permissions?.map(p => p.id) || [] } : { name: '', description: '', permissions: [] }
  showModal.value = true
}
function closeModal() { showModal.value = false; editing.value = null }
async function save() {
  try {
    if (editing.value) await axios.put(`${SERVER}/api/role/${editing.value.id}`, form.value)
    else await axios.post(SERVER + '/api/role', form.value)
    await loadRoles(); closeModal()
  } catch (e) { console.error(e) }
}
async function deleteRole(role) {
  if (!confirm(`نقش «${role.description}» حذف شود؟`)) return
  try { await axios.delete(`${SERVER}/api/role/${role.id}`); await loadRoles() } catch (e) { console.error(e) }
}

onMounted(async () => { await Promise.all([loadRoles(), loadPermissions()]); loading.value = false })
</script>

<style scoped>
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.item-card { padding: 16px; }
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.item-name { font-size: 14px; font-weight: 600; word-break: break-word; }
.item-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; direction: ltr; }
.row-actions { display: flex; gap: 2px; flex-shrink: 0; }
.danger-icon { color: var(--danger) !important; }
.perm-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { background: var(--accent-glow); color: var(--accent); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.empty-sm { font-size: 12px; color: var(--text-muted); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { width: 100%; max-width: 420px; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.perm-checklist { max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.check-row:hover { background: var(--surface2); }
@media (max-width: 768px) {
  .items-grid { grid-template-columns: 1fr; }
  .item-header { gap: 8px; }
  .perm-tags { gap: 3px; }
  .tag { font-size: 10px; padding: 2px 6px; }
}
@media (max-width: 480px) {
  .item-card { padding: 12px; }
  .perm-checklist { max-height: 120px; }
}
</style>
