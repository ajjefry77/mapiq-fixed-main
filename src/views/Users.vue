<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">کاربران</h1>
      <button v-if="authStore.hasPermission('manage_users')" class="btn btn-primary btn-sm" @click="openCreate">
        <i class="fas fa-plus" style="margin-left:4px"></i> کاربر جدید
      </button>
    </div>

    <!-- Search & Sort Bar -->
    <div class="toolbar card">
      <div class="search-box">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="جستجو بر اساس نام، تلفن یا نام کاربری..."
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="sort-box">
        <label class="sort-label">مرتب‌سازی:</label>
        <select v-model="sortField" class="sort-select">
          <option value="name">نام</option>
          <option value="phone">تلفن</option>
          <option value="createdAt">تاریخ</option>
        </select>
        <button class="sort-dir-btn" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'" :title="sortDir === 'asc' ? 'صعودی' : 'نزولی'">
          <i class="fas" :class="sortDir === 'asc' ? 'fa-sort-amount-up' : 'fa-sort-amount-down'"></i>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    <div v-else-if="!users.length" class="empty-state card">هنوز کاربری وجود ندارد.</div>
    <div v-else-if="!pagedUsers.length && searchQuery" class="empty-state card">
      <i class="fas fa-search" style="font-size:24px;margin-bottom:8px;display:block;color:var(--text-muted)"></i>
      نتیجه‌ای برای «{{ searchQuery }}» یافت نشد.
    </div>
    <div v-else>
      <!-- Desktop table -->
      <div class="table-wrap card desktop-only">
        <table class="sub-table">
          <thead>
            <tr>
              <th @click="toggleSort('name')" class="sortable-th">
                نام <i v-if="sortField==='name'" class="fas" :class="sortDir==='asc'?'fa-caret-up':'fa-caret-down'" style="margin-right:4px;color:var(--accent)"></i>
              </th>
              <th @click="toggleSort('phone')" class="sortable-th">
                تلفن <i v-if="sortField==='phone'" class="fas" :class="sortDir==='asc'?'fa-caret-up':'fa-caret-down'" style="margin-right:4px;color:var(--accent)"></i>
              </th>
              <th>نقش‌ها</th>
              <th @click="toggleSort('createdAt')" class="sortable-th">
                تاریخ <i v-if="sortField==='createdAt'" class="fas" :class="sortDir==='asc'?'fa-caret-up':'fa-caret-down'" style="margin-right:4px;color:var(--accent)"></i>
              </th>
              <th v-if="authStore.hasPermission('manage_users')">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in pagedUsers" :key="user.id">
              <td class="font-medium">{{ user.name }}</td>
              <td dir="ltr">{{ user.phone }}</td>
              <td>
                <span v-for="r in getUserRoles(user)" :key="r" class="badge badge-inactive" style="margin-inline-end:4px">{{ r }}</span>
              </td>
              <td class="text-muted">{{ formatDate(user.createdAt) }}</td>
              <td v-if="authStore.hasPermission('manage_users')">
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" @click="editUser(user)"><i class="fas fa-pen"></i></button>
                  <button class="btn btn-ghost btn-sm danger-icon" @click="deleteUser(user)" :disabled="user.id === authStore.user?.id"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="mobile-cards mobile-only">
        <div v-for="user in pagedUsers" :key="user.id" class="user-card card">
          <div class="user-card-top">
            <div>
              <div class="user-card-name">{{ user.name }}</div>
              <div class="user-card-phone" dir="ltr">{{ user.phone }}</div>
            </div>
            <div v-if="authStore.hasPermission('manage_users')" class="row-actions">
              <button class="btn btn-ghost btn-sm" @click="editUser(user)"><i class="fas fa-pen"></i></button>
              <button class="btn btn-ghost btn-sm danger-icon" @click="deleteUser(user)" :disabled="user.id === authStore.user?.id"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="user-card-bottom">
            <span v-for="r in getUserRoles(user)" :key="r" class="badge badge-inactive">{{ r }}</span>
            <span class="user-card-date">{{ formatDate(user.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-bar card">
        <div class="pagination-info">
          نمایش <strong>{{ (page - 1) * perPage + 1 }}</strong> تا <strong>{{ Math.min(page * perPage, filteredUsers.length) }}</strong> از <strong>{{ filteredUsers.length }}</strong> کاربر
        </div>
        <div class="pagination-controls">
          <button class="pg-btn" :disabled="page === 1" @click="page = 1" title="اول">
            <i class="fas fa-angle-double-right"></i>
          </button>
          <button class="pg-btn" :disabled="page === 1" @click="page--" title="قبلی">
            <i class="fas fa-angle-right"></i>
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="pg-dots">···</span>
            <button v-else class="pg-num" :class="{ active: p === page }" @click="page = p">{{ p }}</button>
          </template>
          <button class="pg-btn" :disabled="page === totalPages" @click="page++" title="بعدی">
            <i class="fas fa-angle-left"></i>
          </button>
          <button class="pg-btn" :disabled="page === totalPages" @click="page = totalPages" title="آخر">
            <i class="fas fa-angle-double-left"></i>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal card">
        <h2 class="modal-title">{{ selectedUser ? 'ویرایش کاربر' : 'کاربر جدید' }}</h2>
        <form @submit.prevent="saveUser" class="modal-form">
          <div class="form-row"><label>نام</label><input v-model="userForm.name" type="text" required class="input" /></div>
          <div class="form-row"><label>تلفن</label><input v-model="userForm.phone" type="tel" required class="input" dir="ltr" /></div>
          <div class="form-row"><label>نام کاربری</label><input v-model="userForm.username" type="text" required class="input" /></div>
          <div class="form-row"><label>کد ملی</label><input v-model="userForm.code" type="text" class="input" dir="ltr" /></div>
          <div class="form-row"><label>{{ selectedUser ? 'رمز جدید (اختیاری)' : 'رمز عبور' }}</label>
            <input v-model="userForm.password" type="password" :required="!selectedUser" class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">نقش</label>
            <select v-model="userForm.role_id" class="form-input">
              <option value="">انتخاب نقش</option>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.description }}
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeModal">انصراف</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'در حال ذخیره...' : (selectedUser ? 'بروزرسانی' : 'ایجاد') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { useToast } from "vue-toast-notification";

const SERVER = import.meta.env.VITE_SERVER;
const authStore = useAuthStore();
const $toast = useToast();

const users = ref([]);
const roles = ref([]);
const loading = ref(true);
const showModal = ref(false);
const selectedUser = ref(null);
const saving = ref(false);
const userForm = reactive({ name: '', phone: '', username: '', code: '', password: '', roles: [] });

const searchQuery = ref('');
const sortField = ref('createdAt');
const sortDir = ref('desc');
const page = ref(1);
const perPage = 15;

const filteredUsers = computed(() => {
  let list = [...users.value];
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => {
    let va = a[sortField.value] || '';
    let vb = b[sortField.value] || '';
    if (sortField.value === 'createdAt') {
      va = new Date(va || 0).getTime();
      vb = new Date(vb || 0).getTime();
    } else {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1;
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / perPage));

watch([filteredUsers], () => { page.value = 1; });

const pagedUsers = computed(() => {
  const start = (page.value - 1) * perPage;
  return filteredUsers.value.slice(start, start + perPage);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDir.value = 'asc';
  }
}

function getUserRoles(u) {
  if (u.Roles?.length) return u.Roles.map(r => {
    const found = roles.value.find(role => role.name === r.name);
    return found?.description
  });
  return u.Roles?.map(r => r.description || r.name) || [];
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('fa-IR') : '—'; }

function resetForm() { Object.assign(userForm, { name: '', phone: '', username: '', code: '', password: '', roles: [] }); }

function openCreate() { selectedUser.value = null; resetForm(); showModal.value = true; userForm.role_id = "" }

function editUser(u) {
  selectedUser.value = u;
  Object.assign(userForm, {
    name: u.full_name || u.name,
    phone: u.phone,
    username: u.phone || u.username,
    code: u.code || '',
    password: '',
    role_id: u.Roles[0]?.id || "",
  });
  showModal.value = true;
}

function closeModal() { showModal.value = false; selectedUser.value = null; resetForm(); }

async function loadUsers() {
  try {
    const res = await axios.get(SERVER + '/api/users');
    const raw = res.data.data || res.data;
    users.value = Array.isArray(raw) ? raw.map(u => ({
      ...u,
      name: u.full_name || u.name,
      username: u.phone || u.username,
      createdAt: u.created_at || u.createdAt,
      code: u.code || '',
    })) : [];
  } catch (e) { console.error(e); }
}

async function loadRoles() {
  try {
    const res = await axios.get(SERVER + '/api/roles');
    roles.value = Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : [];
  } catch (e) { console.error(e); }
}

async function saveUser() {
  saving.value = true;

  try {
    if (selectedUser.value) {
      await axios.put(SERVER + `/api/users/${selectedUser.value.id}`, {
        full_name: userForm.name,
        phone: userForm.phone,
        password: userForm.password || undefined,
        role_id: userForm.role_id,
      });
    } else {
      await axios.post(SERVER + '/api/adduser', {
        name: userForm.name,
        phone: userForm.phone,
        username: userForm.username,
        code: userForm.code,
        password: userForm.password,
        role_id: userForm.role_id,
      });
    }

    showMessage(
        selectedUser.value ? "کاربر با موفقیت بروزرسانی شد." : "کاربر با موفقیت ایجاد شد.",
        "success"
    );

    await loadUsers();
    closeModal();

  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}

async function deleteUser(u) {
  if (!confirm(`«${u.name}» حذف شود؟`)) return;

  try {
    await axios.delete(SERVER + `/api/users/${u.id}`);
    showMessage("کاربر حذف شد", "success");
    await loadUsers();
  } catch (error) {
    handleApiError(error);
  }
}

function showMessage(msg, type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000
  })
}

function handleError(error) {
  console.error(error);

  const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "خطایی رخ داد";

  showMessage(message, "error");
}

onMounted(async () => { await Promise.all([loadUsers(), loadRoles()]); loading.value = false; });
</script>

<style scoped>
.loading { text-align: center; padding: 60px; color: var(--text-muted); }

/* Toolbar: Search & Sort */
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  right: 12px;
  font-size: 13px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 9px 36px 9px 12px !important;
  background: var(--surface2) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius) !important;
  color: var(--text) !important;
  font-family: var(--font) !important;
  font-size: 13px !important;
  outline: none !important;
  transition: border-color .18s !important;
}
.search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.search-input::placeholder { color: var(--text-muted); font-size: 12px; }
.search-clear {
  position: absolute;
  left: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-clear:hover { color: var(--text); }

.sort-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.sort-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}
.sort-select {
  padding: 8px 10px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.sort-dir-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  transition: all .15s;
  font-size: 13px;
}
.sort-dir-btn:hover { color: var(--accent); border-color: var(--accent); }

/* Desktop table */
.table-wrap { padding: 0; overflow-x: auto; }
.sub-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sub-table th { padding: 10px 14px; text-align: right; font-weight: 600; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
.sortable-th { cursor: pointer; user-select: none; transition: color .15s; }
.sortable-th:hover { color: var(--text); }
.sub-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
.sub-table tr:last-child td { border-bottom: none; }
.sub-table tr:hover td { background: var(--surface2); }
.text-muted { color: var(--text-muted); font-size: 12px; }
.font-medium { font-weight: 500; }
.row-actions { display: flex; gap: 4px; }
.danger-icon { color: var(--danger) !important; }

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 12px;
}
.pagination-info { font-size: 12px; color: var(--text-muted); }
.pagination-info strong { color: var(--text); font-weight: 600; }
.pagination-controls { display: flex; align-items: center; gap: 4px; }
.pg-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius); border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 12px; cursor: pointer; transition: all .15s; }
.pg-btn:hover:not(:disabled) { background: var(--surface2); color: var(--text); border-color: var(--accent); }
.pg-btn:disabled { opacity: .3; cursor: not-allowed; }
.pg-num { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: var(--radius); border: 1px solid transparent; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; }
.pg-num:hover { background: var(--surface2); color: var(--text); }
.pg-num.active { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 2px 8px var(--accent-glow); font-weight: 700; }
.pg-dots { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 32px; color: var(--text-muted); font-size: 14px; letter-spacing: 2px; user-select: none; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { width: 100%; max-width: 440px; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.check-grid { display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); }
.check-item { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
.check-item:hover { background: var(--surface2); }

/* Hide/show toggles */
.desktop-only { display: block; }
.mobile-only { display: none !important; }
.empty-state { text-align: center; padding: 40px; color: var(--text-muted); }

/* Mobile cards */
.mobile-cards { display: flex; flex-direction: column; gap: 8px; }
.user-card { margin-bottom: 0; }
.user-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.user-card-name { font-size: 14px; font-weight: 600; }
.user-card-phone { font-size: 12px; color: var(--text-muted); direction: ltr; margin-top: 2px; }
.user-card-bottom { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.user-card-date { font-size: 11px; color: var(--text-muted); margin-inline-start: auto; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; flex-direction: column; gap: 0; }

  .toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }
  .search-box { width: 100%; }
  .sort-box { width: 100%; justify-content: space-between; }
  .sort-select { flex: 1; }

  .pagination-bar {
    flex-direction: column-reverse;
    gap: 10px;
    align-items: stretch;
    text-align: center;
  }
  .pagination-controls { justify-content: center; }

  .modal { max-width: 100%; }
}

@media (max-width: 480px) {
  .user-card-top { flex-direction: column; gap: 8px; }
  .row-actions { justify-content: flex-end; }
  .sort-box { flex-wrap: wrap; }
  .pagination-info { font-size: 11px; }
  .pg-btn { width: 28px; height: 28px; }
  .pg-num { min-width: 28px; height: 28px; font-size: 12px; }
}
</style>
