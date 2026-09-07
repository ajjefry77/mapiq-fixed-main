<template>
  <div class="page forms-page">
    <div class="page-header">
      <div class="title-wrap">
        <div class="title-icon"><i class="fas fa-wpforms"></i></div>
        <div>
          <h1 class="page-title">فرم‌ها <span v-if="!loading && forms.length" class="count-pill">{{ faNum(forms.length) }} فرم</span></h1>
          <p class="page-subtitle">ساخت، انتشار و جمع‌آوری پاسخ — همه در یک نگاه</p>
        </div>
      </div>
      <div class="header-tools">
        <div v-if="forms.length" class="search-box">
          <i class="fas fa-search"></i>
          <input v-model="search" class="input search-input" placeholder="جستجوی فرم..." />
        </div>
        <router-link v-if="canManageForms" to="/forms/new" class="btn btn-primary btn-sm new-form-btn">
          <i class="fas fa-plus"></i> فرم جدید
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="forms-grid">
      <div v-for="i in 6" :key="i" class="form-card card skeleton-card">
        <div class="skeleton" style="height:16px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:80%;margin-top:10px"></div>
        <div class="skeleton" style="height:12px;width:60%;margin-top:8px"></div>
        <div class="skeleton" style="height:32px;width:100%;margin-top:16px"></div>
      </div>
    </div>
    <div v-else-if="error" class="error-msg card">❌ {{ error }}</div>
    <div v-else-if="!forms.length" class="empty-state">
      <div class="empty-icon"><i class="fas fa-clipboard-list"></i></div>
      <h3>{{ canManageForms ? "هنوز فرمی نساخته‌اید" : "فرمی به شما اختصاص داده نشده" }}</h3>
      <p>{{ canManageForms ? "در چند ثانیه اولین فرم هوشمند خود را بسازید و لینک عمومی بگیرید." : "وقتی مدیری فرمی برای گروه شما منتشر کند، اینجا نمایش داده می‌شود." }}</p>
      <router-link v-if="canManageForms" to="/forms/new" class="btn btn-primary" style="margin-top:16px"><i class="fas fa-plus"></i> ساخت اولین فرم</router-link>
    </div>
    <div v-else-if="!filtered.length" class="empty-state">
      <p>فرمی با عبارت «{{ search }}» پیدا نشد.</p>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" @click="search=''">پاک کردن جستجو</button>
    </div>
    <div v-else class="forms-grid">
      <div v-for="form in filtered" :key="form.id" class="form-card card">
        <div class="card-glow"></div>
        <div class="form-card-top">
          <div class="form-ic" :class="form.is_active ? '' : 'form-ic--off'">
            <i class="fas fa-file-alt"></i>
          </div>
          <span class="badge" :class="form.is_active ? 'badge-active' : 'badge-inactive'">
            <span class="dot"></span>{{ form.is_active ? 'فعال' : 'غیرفعال' }}
          </span>
        </div>
        <h2 class="form-title" :title="form.title">{{ form.title }}</h2>
        <p v-if="form.description" class="form-desc">{{ form.description }}</p>
        <p v-else class="form-desc form-desc--empty">بدون توضیحات</p>
        <div class="form-chips">
          <span class="chip"><i class="fas fa-list-ul"></i> {{ faNum(form.fields?.length || 0) }} فیلد</span>
          <span class="chip chip--group"><i class="fas fa-users"></i> {{ getGroupName(form) || 'بدون گروه' }}</span>
          <span class="chip chip--date"><i class="far fa-calendar-alt"></i> {{ formatDate(form.created_at ?? form.createdAt) }}</span>
        </div>
        <div class="assign-row" v-if="canManageForms">
          <button class="assign-link" @click="openAssignModal(form)">
            <i class="fas fa-user-plus"></i> {{ form.group_id ? 'تغییر گروه' : 'انتساب به گروه' }}
          </button>
        </div>
        <div class="soft-divider"></div>
        <div class="form-actions">
          <router-link v-if="canManageForms" :to="`/forms/${form.id}/edit`" class="action-btn" title="ویرایش"><i class="fas fa-pen"></i><span>ویرایش</span></router-link>
          <router-link :to="`/forms/${form.id}/preview`" class="action-btn" title="پیش‌نمایش"><i class="fas fa-eye"></i><span>نمایش</span></router-link>
          <router-link :to="`/forms/${form.id}/submissions`" class="action-btn" title="پاسخ‌ها"><i class="fas fa-inbox"></i><span>پاسخ‌ها</span></router-link>
          <button class="action-btn" @click="copyLink(form)" title="کپی لینک عمومی"><i class="fas fa-link"></i><span>لینک</span></button>
          <button v-if="canManageForms" class="action-btn danger" @click="confirmDelete(form)" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>

    <!-- ASSIGN MODAL -->
    <Transition name="modal">
      <div v-if="showAssignModal" class="modal-backdrop" @click.self="closeAssignModal">
        <div class="modal modal-sm card">
          <h2 class="modal-title"><i class="fas fa-users" style="color:var(--accent)"></i> انتساب فرم به گروه</h2>
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
    </Transition>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from "vue"
import { useForms } from "../../composables/fb/useForms.js"
import { useAuthStore } from "../../stores/auth"
import { useNotify } from "../../composables/useNotify"
import axios from "axios"

const SERVER = import.meta.env.VITE_SERVER
const { forms, loading, error, fetchForms, deleteForm, updateForm } = useForms()
const authStore = useAuthStore()
const { success, handleError } = useNotify()
const canManageForms = computed(() => authStore.isAdmin || authStore.isGroupManager)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim()
  if (!q) return forms.value
  return forms.value.filter(f => (f.title || '').includes(q) || (f.description || '').includes(q))
})

function faNum(n) { try { return Number(n).toLocaleString('fa-IR') } catch { return n } }

const groups = ref([])

function getGroupManagerId(g) {
  return g.manager_id ?? g.created_by ?? g.creator_id ?? g.managed_by ?? g.owner_id ?? g.user_id ?? g.manager?.id ?? g.Manager?.id ?? g.creator?.id ?? g.createdBy
}

const displayGroups = computed(() => {
  if (authStore.isAdmin) return groups.value
  if (authStore.isGroupManager) {
    const userId = String(authStore.user?.id)
    const hasManagerField = groups.value.some(g => getGroupManagerId(g) != null)
    return groups.value.filter(g => {
      const mid = getGroupManagerId(g)
      return mid != null ? String(mid) === userId : !hasManagerField
    })
  }
  return []
})

// Assign modal
const showAssignModal = ref(false)
const assignForm = ref(null)
const assignGroupId = ref(null)
const assignSaving = ref(false)

function getGroupName(form) {
  if (!form) return null
  if (form.group && (form.group.name || form.Group?.name)) return form.group.name || form.Group?.name
  const gid = form.group_id ?? form.groupId
  if (gid == null) return null
  const g = groups.value.find(x => String(x.id) === String(gid))
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
    success('انتساب فرم بروزرسانی شد')
    closeAssignModal()
  } catch (e) { handleError(e) }
  finally { assignSaving.value = false }
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" })
}

async function confirmDelete(form) {
  if (!confirm(`فرم «${form.title}» حذف شود؟`)) return
  try {
    await deleteForm(form.id)
    success('فرم حذف شد')
  } catch (e) { handleError(e) }
}

async function copyLink(form) {
  const url = `${window.location.origin}/f/${form.id}`
  try {
    await navigator.clipboard.writeText(url)
    success("لینک عمومی فرم کپی شد")
  } catch {
    prompt("لینک عمومی فرم:", url)
  }
}

onMounted(async () => {
  await fetchForms()
  try {
    const res = await axios.get(SERVER + "/api/groups")
    groups.value = Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : []
  } catch (e) { handleError(e) }
})
</script>

<style scoped>
.forms-page .title-wrap { display: flex; align-items: center; gap: 12px; }
.title-icon {
  width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #d9732b, var(--accent-soft));
  color: #fff; font-size: 18px;
  box-shadow: 0 4px 16px var(--accent-glow-strong), inset 0 1px 0 rgba(255,255,255,.25);
}
.count-pill {
  font-size: 11px; font-weight: 700; background: var(--accent-glow);
  border: 1px solid rgba(232,132,60,.3); color: var(--accent-soft);
  padding: 2px 10px; border-radius: 999px; vertical-align: middle; margin-right: 6px;
}
.header-tools { display: flex; align-items: center; gap: 10px; }
.search-box { position: relative; }
.search-box i { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-faint); font-size: 12px; pointer-events: none; }
.search-input { padding-right: 32px !important; width: 220px; min-height: 36px !important; font-size: 13px !important; border-radius: 12px !important; }
.new-form-btn { box-shadow: 0 4px 16px var(--accent-glow-strong); }

.forms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.form-card { position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 18px; }
.card-glow {
  position: absolute; top: 0; right: 0; left: 0; height: 3px;
  background: linear-gradient(to left, var(--accent), var(--accent-soft), transparent);
  opacity: .9;
}
.form-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.form-ic {
  width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: var(--accent-glow); border: 1px solid rgba(232,132,60,.25); color: var(--accent-soft); font-size: 15px;
}
.form-ic--off { background: rgba(154,161,192,.1); border-color: var(--border); color: var(--text-muted); }
.badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
.form-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.form-desc { font-size: 12.5px; color: var(--text-muted); margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; line-height: 1.7; }
.form-desc--empty { opacity: .5; font-style: italic; }
.form-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.chip {
  font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,.03);
  border: 1px solid var(--border); padding: 3px 9px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 5px;
}
.chip i { font-size: 10px; color: var(--accent-soft); }
.chip--group { color: var(--accent-soft); border-color: rgba(232,132,60,.25); background: var(--accent-glow); }
.assign-row { margin-top: 4px; }
.assign-link { background: none; border: none; cursor: pointer; font-family: var(--font); font-size: 11.5px; color: var(--info); display: inline-flex; align-items: center; gap: 5px; padding: 2px 0; }
.assign-link:hover { text-decoration: underline; }
.form-actions { display: flex; align-items: center; gap: 2px; margin-top: auto; }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 9px;
  font-size: 12px; font-weight: 600; color: var(--text-muted); border: none; background: none; cursor: pointer;
  transition: all .15s; font-family: var(--font);
}
.action-btn:hover { background: var(--surface2); color: var(--text); }
.action-btn.danger { color: var(--danger); margin-right: auto; padding: 7px 9px; }
.action-btn.danger:hover { background: var(--danger-glow); }
.skeleton-card { min-height: 190px; }
.empty-state h3 { font-size: 16px; margin: 12px 0 6px; color: var(--text); }
.empty-state p { font-size: 13px; max-width: 420px; margin: 0 auto; line-height: 1.9; }
.empty-icon {
  width: 64px; height: 64px; border-radius: 20px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center; font-size: 26px;
  background: var(--accent-glow); border: 1px dashed rgba(232,132,60,.4); color: var(--accent-soft);
}
.assign-form-title { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.loading, .error-msg { text-align: center; padding: 60px; color: var(--text-muted); }
@media (max-width: 768px) {
  .forms-grid { grid-template-columns: 1fr; gap: 10px; }
  .form-card { padding: 14px; }
  .header-tools { width: 100%; }
  .search-box { flex: 1; } .search-input { width: 100% !important; }
  .action-btn span { font-size: 11px; }
}
</style>
