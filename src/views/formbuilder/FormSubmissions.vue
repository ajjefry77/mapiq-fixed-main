<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">پاسخ‌های فرم: {{ form?.title }}</h1>
      <router-link :to="`/forms/${route.params.id}/edit`" class="btn btn-ghost btn-sm back-btn">← برگشت</router-link>
    </div>

    <div class="filters-sticky">
      <div class="filters card">
        <div class="simple-filters">
          <label class="filter-field"><span>از تاریخ</span><input v-model="dateFilters.from" type="date" class="input" /></label>
          <label class="filter-field"><span>تا تاریخ</span><input v-model="dateFilters.to" type="date" class="input" /></label>
          <label class="filter-field"><span>مرتب‌سازی</span>
            <select v-model="dateFilters.sort" class="select-native">
              <option value="desc">جدیدترین</option>
              <option value="asc">قدیمی‌ترین</option>
            </select>
          </label>
        </div>
        <div class="filters-actions">
          <button class="btn btn-primary btn-sm" @click="applyFilters">اعمال فیلتر</button>
          <button class="btn btn-ghost btn-sm" @click="resetFilters">پاک کردن</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    <template v-else>
      <div v-if="!submissions.length" class="empty-state card"><p>پاسخی با این فیلترها یافت نشد.</p></div>
      <div v-else>
        <p class="sub-count">{{ submissions.length }} پاسخ</p>
        <div class="table-wrap card">
          <table class="sub-table">
            <thead>
              <tr>
                <th>#</th>
                <th v-for="field in form.fields" :key="field.id">{{ field.label }}</th>
                <th>تاریخ ارسال</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sub, idx) in submissions" :key="sub.id">
                <td>{{ idx + 1 }}</td>
                <td v-for="field in form.fields" :key="field.id"><span class="cell-val">{{ formatValue(sub.data[field.id]) }}</span></td>
                <td>{{ formatDate(sub.submitted_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useForms } from "../../composables/fb/useForms.js"

const route = useRoute()
const { fetchForm, fetchSubmissions } = useForms()

const form = ref(null)
const submissions = ref([])
const loading = ref(true)
const dateFilters = reactive({ sort: "desc", from: "", to: "" })

async function loadSubmissions() {
  const params = {
    sort: dateFilters.sort,
    from: dateFilters.from ? `${dateFilters.from}T00:00:00` : "",
    to: dateFilters.to ? `${dateFilters.to}T23:59:59` : "",
  }
  submissions.value = await fetchSubmissions(route.params.id, params)
}

async function applyFilters() { await loadSubmissions() }
async function resetFilters() {
  dateFilters.sort = "desc"
  dateFilters.from = ""
  dateFilters.to = ""
  await loadSubmissions()
}

onMounted(async () => {
  form.value = await fetchForm(route.params.id)
  await loadSubmissions()
  loading.value = false
})

function formatDate(str) { return new Date(str).toLocaleString("fa-IR") }
function formatValue(val) {
  if (val === undefined || val === null || val === "") return "—"
  if (Array.isArray(val)) return val.join("، ")
  return String(val)
}
</script>

<style scoped>
.filters-sticky { position: sticky; top: 76px; z-index: 10; }
.filters { padding: 16px; margin-bottom: 8px; }
.simple-filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 140px; flex: 1; }
.filter-field span { font-size: 12px; color: var(--text-muted); }
.filters-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
.sub-count { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.table-wrap { padding: 0; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.sub-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sub-table th { padding: 12px 14px; text-align: right; font-weight: 600; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
.sub-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.sub-table tr:last-child td { border-bottom: none; }
.sub-table tr:hover td { background: var(--surface2); }
.cell-val { max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
@media (max-width: 768px) {
  .filters-sticky { top: 60px; }
  .filter-field { min-width: 100%; }
  .filters-actions { flex-wrap: wrap; }
  .sub-table { font-size: 12px; }
  .sub-table th, .sub-table td { padding: 8px 10px; }
}
</style>
