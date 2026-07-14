<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">فرم‌ها</h1>
      <router-link v-if="canManageForms" to="/forms/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus" style="margin-left:4px"></i> فرم جدید
      </router-link>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    <div v-else-if="error" class="error-msg">❌ {{ error }}</div>
    <div v-else-if="!forms.length" class="empty-state">
      <p>{{ canManageForms ? "هنوز فرمی نساخته‌اید." : "هنوز فرمی به شما اختصاص داده نشده است." }}</p>
      <router-link v-if="canManageForms" to="/forms/new" class="btn btn-primary" style="margin-top: 12px">اولین فرم را بسازید</router-link>
    </div>
    <div v-else class="forms-grid">
      <div v-for="form in forms" :key="form.id" class="form-card card">
        <div class="form-card-header">
          <span class="badge" :class="form.is_active ? 'badge-active' : 'badge-inactive'">{{ form.is_active ? 'فعال' : 'غیرفعال' }}</span>
          <span class="form-date">{{ formatDate(form.created_at) }}</span>
        </div>
        <h2 class="form-title">{{ form.title }}</h2>
        <p v-if="form.description" class="form-desc">{{ form.description }}</p>
        <div class="form-meta">
          <span v-if="getGroupName(form.group_id)" class="group-tag">
            <i class="fas fa-users" style="margin-left:3px;font-size:10px"></i> {{ getGroupName(form.group_id) }}
          </span>
          <button v-if="canManageForms" class="btn btn-ghost btn-xs" @click="openAssignModal(form)">
            <i class="fas fa-user-plus" style="margin-left:3px;font-size:10px"></i> {{ form.group_id ? 'تغییر گروه' : 'انتساب به گروه' }}
          </button>
        </div>
        <div class="form-actions">
          <router-link v-if="canManageForms" :to="`/forms/${form.id}/edit`" class="btn btn-ghost btn-sm">ویرایش</router-link>
          <router-link :to="`/forms/${form.id}/preview`" class="btn btn-ghost btn-sm">پیش‌نمایش</router-link>
          <router-link :to="`/forms/${form.id}/submissions`" class="btn btn-ghost btn-sm">پاسخ‌ها</router-link>
          <button class="btn btn-ghost btn-sm" @click="copyLink(form)">لینک عمومی</button>
          <button v-if="canManageForms" class="btn btn-danger btn-sm" @click="confirmDelete(form)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>

    <!-- ASSIGN MODAL -->
    <div v-if="showAssignModal" class="modal-backdrop" @click.self="closeAssignModal">
      <div class="modal card" style="max-width:380px">
        <h2 class="modal-title">انتساب فرم به گروه</h2>
        <p class="assign-form-title">{{ assignForm?.title }}</p>
        <div class="modal-form">
          <div class="form-row">
            <label>گروه</label>
            <select v-model="assignGroupId" class="input">
              <option :value="null">بدون گروه (همه)</option>
              <option v-for="g in displayGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:14px">
          <button class="btn btn-ghost" @click="closeAssignModal">انصراف</button>
          <button class="btn btn-primary" @click="saveAssignment" :disabled="assignSaving">{{ assignSaving ? 'در حال ذخیره...' : 'ذخیره' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from "vue"
import { useForms } from "../../composables/fb/useForms.js"
import { useAuthStore } from "../../stores/auth"
import axios from "axios"

const SERVER = import.meta.env.VITE_SERVER
const { forms, loading, error, fetchForms, deleteForm, updateForm } = useForms()
const authStore = useAuthStore()
const canManageForms = computed(() => authStore.isAdmin || authStore.isGroupManager)

const groups = ref([])

const displayGroups = computed(() => {
  if (authStore.isAdmin) return groups.value
  if (authStore.isGroupManager) return groups.value.filter(g => g.manager_id === authStore.user?.id)
  return []
})

// Assign modal
const showAssignModal = ref(false)
const assignForm = ref(null)
const assignGroupId = ref(null)
const assignSaving = ref(false)

function getGroupName(gid) {
  if (!gid) return null
  const g = groups.value.find(x => x.id === gid)
  return g?.name || null
}

function openAssignModal(form) {
  assignForm.value = form
  assignGroupId.value = form.group_id ?? null
  showAssignModal.value = true
}

function closeAssignModal() {
  showAssignModal.value = false
  assignForm.value = null
}

async function saveAssignment() {
  assignSaving.value = true
  try {
    await updateForm(assignForm.value.id, { group_id: assignGroupId.value })
    closeAssignModal()
  } catch (e) { console.error(e) }
  finally { assignSaving.value = false }
}

function formatDate(str) {
  return new Date(str).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" })
}

async function confirmDelete(form) {
  if (!confirm(`فرم «${form.title}» حذف شود؟`)) return
  await deleteForm(form.id)
}

async function copyLink(form) {
  const url = `${window.location.origin}/f/${form.id}`
  try {
    await navigator.clipboard.writeText(url)
    alert("لینک عمومی فرم کپی شد:\n" + url)
  } catch {
    prompt("لینک عمومی فرم:", url)
  }
}

onMounted(async () => {
  await fetchForms()
  try {
    const res = await axios.get(SERVER + "/api/groups")
    groups.value = Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : []
  } catch (e) { console.error(e) }
})
</script>

<style scoped>
.forms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.form-card { transition: transform 0.15s, box-shadow 0.15s; display: flex; flex-direction: column; }
.form-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25); }
.form-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.form-date { font-size: 11px; color: var(--text-muted); }
.form-title { font-size: 17px; font-weight: 600; margin-bottom: 6px; word-break: break-word; }
.form-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.form-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.group-tag { font-size: 11px; color: var(--accent); background: var(--accent-glow); padding: 3px 8px; border-radius: var(--radius); display: inline-flex; align-items: center; }
.btn-xs { font-size: 11px !important; padding: 2px 8px !important; }
.form-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.loading, .error-msg { text-align: center; padding: 60px; color: var(--text-muted); }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { width: 100%; max-width: 380px; }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.assign-form-title { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 768px) {
  .forms-grid { grid-template-columns: 1fr; gap: 10px; }
  .form-card:hover { transform: none; }
  .form-card { padding: 14px; }
  .form-title { font-size: 15px; }
  .form-actions { gap: 4px; }
  .form-actions .btn { font-size: 11px; padding: 5px 8px; }
}
@media (max-width: 480px) {
  .form-meta { gap: 4px; }
  .form-card-header { margin-bottom: 8px; }
}
</style>
