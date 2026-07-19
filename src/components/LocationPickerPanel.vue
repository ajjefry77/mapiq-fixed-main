<template>
  <transition name="sheet-slide">
    <div v-if="visible" class="lpp-backdrop" @click.self="close">
      <!-- ═══════ BOTTOM SHEET (full width) ═══════ -->
      <div
        class="lpp-sheet"
        :class="sheetClass"
        :style="sheetStyle"
        ref="sheetEl"
      >
        <!-- Drag handle -->
        <div
          class="lpp-handle-area"
          @mousedown="startDrag"
          @touchstart.passive="startDrag"
        >
          <div class="lpp-handle"></div>
          <div class="lpp-header">
            <div class="lpp-title-wrap">
              <button class="lpp-close" @click="close" title="بستن">✕</button>
              <span class="lpp-title">ثبت اطلاعات مکانی</span>
            </div>
            <div class="lpp-snaps">
              <button
                v-for="s in snapLabels" :key="s.snap"
                class="lpp-snap-btn" :class="{ active: currentSnap === s.snap }"
                @click="snapTo(s.snap)"
              >{{ s.label }}</button>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="lpp-tabs">
          <button
            class="lpp-tab"
            :class="{ active: activeTab === 'forms' }"
            @click="activeTab = 'forms'"
          >
            <i class="fas fa-file-lines"></i> فرم‌ها
          </button>
          <button
            class="lpp-tab"
            :class="{ active: activeTab === 'location' }"
            @click="activeTab = 'location'"
          >
            <i class="fas fa-location-dot"></i> موقعیت
          </button>
        </div>

        <div class="lpp-body" ref="sheetBodyEl">
          <!-- ───── TAB: FORMS ───── -->
          <div v-show="activeTab === 'forms'" class="lpp-tab-pane">
            <div v-if="!selectedFormId">
              <div v-if="formsLoading" class="lpp-state">
                <div class="lpp-spinner-lg"></div>
                <p>در حال بارگذاری فرم‌ها...</p>
              </div>

              <div v-else-if="formsError" class="lpp-state lpp-error">
                <span class="lpp-state-icon">⚠️</span>
                <p>{{ formsError }}</p>
                <button class="lpp-btn lpp-btn-ghost" @click="loadForms">تلاش مجدد</button>
              </div>

              <div v-else-if="!assignedForms.length" class="lpp-state">
                <span class="lpp-state-icon">📋</span>
                <p>فرمی به شما اختصاص داده نشده است</p>
              </div>

              <div v-else class="lpp-forms-list">
                <button
                  v-for="form in assignedForms" :key="form.id"
                  class="lpp-form-item"
                  @click="selectForm(form)"
                >
                  <div class="lpp-form-icon">📝</div>
                  <div class="lpp-form-body">
                    <div class="lpp-form-title">{{ form.title }}</div>
                    <div class="lpp-form-desc" v-if="form.description">{{ form.description }}</div>
                  </div>
                  <span class="lpp-form-arrow">←</span>
                </button>
              </div>
            </div>

            <!-- Selected form renderer -->
            <div v-else class="lpp-form-view">
              <button class="lpp-back" @click="selectedFormId = null">
                <i class="fas fa-arrow-right"></i> بازگشت به لیست فرم‌ها
              </button>

              <div v-if="formLoading" class="lpp-state">
                <div class="lpp-spinner-lg"></div>
                <p>در حال بارگذاری فرم...</p>
              </div>

              <div v-else-if="currentForm" class="lpp-fields">
                <div class="lpp-form-head">
                  <span class="lpp-badge" :class="currentForm.is_active ? 'on' : 'off'">
                    {{ currentForm.is_active ? 'فعال' : 'غیرفعال' }}
                  </span>
                  <h3 class="lpp-form-name">{{ currentForm.title }}</h3>
                  <p v-if="currentForm.description" class="lpp-form-sub">{{ currentForm.description }}</p>
                </div>

                <!-- Coords bar (always shown) -->
                <div class="lpp-coords-bar">
                  <div class="lpp-coord-item">
                    <span class="lpp-coord-label">عرض (Lat)</span>
                    <input class="lpp-input" type="number" step="0.000001"
                      :value="coordLat" @input="coordLat = $event.target.value"
                      @blur="applyManualCoords" placeholder="35.689" />
                  </div>
                  <div class="lpp-coord-item">
                    <span class="lpp-coord-label">طول (Lng)</span>
                    <input class="lpp-input" type="number" step="0.000001"
                      :value="coordLng" @input="coordLng = $event.target.value"
                      @blur="applyManualCoords" placeholder="51.389" />
                  </div>
                  <button class="lpp-btn-icon" :disabled="locating" @click="getGPSAndSet" title="موقعیت من">
                    <span v-if="locating" class="lpp-spinner-sm"></span>
                    <span v-else>📍</span>
                  </button>
                </div>
                <p v-if="coordError" class="lpp-field-error">{{ coordError }}</p>

                <div class="lpp-divider"></div>

                <div v-for="field in nonLocationFields" :key="field.id" class="lpp-field-group">
                  <template v-if="['text','email','phone','number','date'].includes(field.type)">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <input
                      :type="field.type === 'phone' ? 'tel' : field.type"
                      :placeholder="field.placeholder"
                      v-model="formData[field.id]"
                      class="lpp-input" :class="{ error: validationErrors[field.id] }"
                    />
                    <p v-if="field.helpText" class="lpp-help">{{ field.helpText }}</p>
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>

                  <template v-else-if="field.type === 'textarea'">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <textarea :placeholder="field.placeholder" v-model="formData[field.id]"
                      class="lpp-textarea" :class="{ error: validationErrors[field.id] }" />
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>

                  <template v-else-if="field.type === 'select'">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <select v-model="formData[field.id]" class="lpp-select">
                      <option value="" disabled>انتخاب کنید...</option>
                      <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>

                  <template v-else-if="field.type === 'radio'">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <div class="lpp-radio-group">
                      <label v-for="opt in field.options" :key="opt" class="lpp-radio-label">
                        <input type="radio" :name="field.id" :value="opt" v-model="formData[field.id]" />
                        {{ opt }}
                      </label>
                    </div>
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>

                  <template v-else-if="field.type === 'checkbox'">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <div class="lpp-checkbox-group">
                      <label v-for="opt in field.options" :key="opt" class="lpp-checkbox-label">
                        <input type="checkbox" :value="opt"
                          :checked="(formData[field.id] || []).includes(opt)"
                          @change="toggleCheckbox(field.id, opt, $event)" />
                        {{ opt }}
                      </label>
                    </div>
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>

                  <template v-else-if="field.type === 'file' || field.type === 'image'">
                    <label class="lpp-field-label">
                      {{ field.label }}<span v-if="field.required" class="lpp-required">*</span>
                    </label>
                    <input type="file"
                      :accept="field.type === 'image' ? 'image/*' : undefined"
                      @change="onFileChange(field.id, $event)" class="lpp-input" />
                    <p v-if="formData[field.id]?.name" class="lpp-help">{{ formData[field.id].name }}</p>
                    <p v-if="validationErrors[field.id]" class="lpp-field-error">{{ validationErrors[field.id] }}</p>
                  </template>
                </div>

                <div class="lpp-submit-section">
                  <div v-if="submitError" class="lpp-submit-error">⚠️ {{ submitError }}</div>
                  <button class="lpp-btn lpp-btn-success lpp-submit-btn" :disabled="submitting" @click="handleSubmit">
                    <span v-if="submitting" class="lpp-spinner-sm"></span>
                    {{ submitting ? 'در حال ارسال...' : '✅ ارسال اطلاعات' }}
                  </button>
                </div>

                <div v-if="submitted" class="lpp-success">
                  <div class="lpp-success-icon">✅</div>
                  <h3>اطلاعات با موفقیت ثبت شد!</h3>
                  <button class="lpp-btn lpp-btn-ghost" @click="resetForm">ارسال فرم دیگر</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ───── TAB: LOCATION ───── -->
          <div v-show="activeTab === 'location'" class="lpp-tab-pane">
            <div class="lpp-loc-grid">
              <div class="lpp-loc-card">
                <span class="lpp-loc-label">عرض جغرافیایی (Lat)</span>
                <span class="lpp-loc-val">{{ coordLat || '—' }}</span>
              </div>
              <div class="lpp-loc-card">
                <span class="lpp-loc-label">طول جغرافیایی (Lng)</span>
                <span class="lpp-loc-val">{{ coordLng || '—' }}</span>
              </div>
            </div>
            <p class="lpp-loc-hint">
              برای تغییر موقعیت، مجدداً روی نقشه کلیک کنید یا از دکمه 📍 برای دریافت موقعیت فعلی استفاده نمایید.
            </p>
            <button class="lpp-btn lpp-btn-icon-wide" :disabled="locating" @click="getGPSAndSet">
              <span v-if="locating" class="lpp-spinner-sm"></span>
              <span v-else>📍</span>
              دریافت موقعیت فعلی (GPS)
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { useForms } from '../composables/fb/useForms.js'
import { useGroups } from '../composables/fb/useGroups.js'
import { useAuthStore } from '../stores/auth'
import { useGeolocation } from '../composables/fb/useGeolocation.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  lat: { type: [Number, String], default: null },
  lng: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:visible', 'close'])

const authStore = useAuthStore()
const { fetchForms, fetchForm, submitForm } = useForms()
const { fetchGroups } = useGroups()
const { locating, geoError, locate } = useGeolocation()

// ─── Forms ──────────────────────────────────────────
const allForms = ref([])
const formsLoading = ref(false)
const formsError = ref(null)
const selectedFormId = ref(null)
const currentForm = ref(null)
const formLoading = ref(false)

const assignedForms = computed(() => {
  try {
    const forms = Array.isArray(allForms.value) ? allForms.value : []
    if (!forms.length) return []
    const user = authStore.user || {}
    const raw = user.group_ids ?? user.Groups ?? []
    const myGroupIds = (Array.isArray(raw) ? raw : []).map(g => String((g && g.id) ?? g))
    return forms
      .filter(f => f && f.is_active)
      .filter(f => {
        const gid = f?.group_id ?? f?.Group?.id ?? null
        if (gid == null) return true // بدون گروه = همه
        return myGroupIds.includes(String(gid))
      })
  } catch (e) {
    console.error('assignedForms error:', e)
    return Array.isArray(allForms.value) ? allForms.value.filter(f => f && f.is_active) : []
  }
})

async function loadForms() {
  formsLoading.value = true
  formsError.value = null
  try {
    await fetchGroups().catch(() => {})
    allForms.value = await fetchForms()
  } catch (e) {
    formsError.value = e.message || 'خطا در بارگذاری فرم‌ها'
  } finally {
    formsLoading.value = false
  }
}

async function selectForm(form) {
  selectedFormId.value = form.id
  formLoading.value = true
  try {
    currentForm.value = await fetchForm(form.id)
  } catch (e) {
    formsError.value = e.message || 'خطا در بارگذاری فرم'
    selectedFormId.value = null
  } finally {
    formLoading.value = false
  }
}

// ─── Location ───────────────────────────────────────
const coordLat = ref('')
const coordLng = ref('')
const coordError = ref(null)

watch(() => [props.lat, props.lng], ([la, ln]) => {
  if (la != null && ln != null) {
    coordLat.value = +(+la).toFixed(6)
    coordLng.value = +(+ln).toFixed(6)
  }
}, { immediate: true })

function applyManualCoords() {
  const la = parseFloat(coordLat.value)
  const ln = parseFloat(coordLng.value)
  if (isNaN(la) || isNaN(ln)) return
  if (la < -90 || la > 90 || ln < -180 || ln > 180) {
    coordError.value = 'مختصات نامعتبر است'
    return
  }
  coordError.value = null
  emit('update:coords', { lat: +la.toFixed(6), lng: +ln.toFixed(6) })
}

function getGPSAndSet() {
  locate(({ lat, lng }) => {
    coordLat.value = +lat.toFixed(6)
    coordLng.value = +lng.toFixed(6)
    coordError.value = null
    emit('update:coords', { lat: +lat.toFixed(6), lng: +lng.toFixed(6) })
  })
}

// ─── Form submission ────────────────────────────────
const formData = reactive({})
const validationErrors = reactive({})
const submitting = ref(false)
const submitError = ref(null)
const submitted = ref(false)

const nonLocationFields = computed(() =>
  (currentForm.value?.fields || []).filter(f => f.type !== 'location')
)

function onFileChange(fieldId, e) {
  formData[fieldId] = e.target.files?.[0] || null
}

function toggleCheckbox(fieldId, opt, e) {
  if (!formData[fieldId]) formData[fieldId] = []
  if (e.target.checked) formData[fieldId].push(opt)
  else formData[fieldId] = formData[fieldId].filter(v => v !== opt)
}

async function handleSubmit() {
  const errs = {}
  let ok = true
  const lat = parseFloat(coordLat.value)
  const lng = parseFloat(coordLng.value)

  if (isNaN(lat) || isNaN(lng)) {
    coordError.value = 'لطفاً یک موقعیت انتخاب کنید'
    ok = false
  }

  for (const field of currentForm.value?.fields || []) {
    if (field.type === 'location') {
      if (field.required && (isNaN(lat) || isNaN(lng))) {
        errs[field.id] = 'موقعیت جغرافیایی الزامی است'
        ok = false
      }
      continue
    }
    const val = formData[field.id]
    const empty = val === undefined || val === null || val === '' ||
      (Array.isArray(val) && val.length === 0)

    if (field.type === 'file' || field.type === 'image') {
      if (field.required && !(formData[field.id] instanceof File)) {
        errs[field.id] = `«${field.label}» الزامی است`
        ok = false
      }
      continue
    }
    if (field.required && empty) {
      errs[field.id] = `«${field.label}» الزامی است`
      ok = false
    }
  }

  Object.keys(validationErrors).forEach(k => delete validationErrors[k])
  Object.assign(validationErrors, errs)

  if (!ok) {
    snapTo('max')
    return
  }

  submitting.value = true
  submitError.value = null
  try {
    const payload = { ...formData }
    payload._location = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }
    const locField = currentForm.value.fields.find(f => f.type === 'location')
    if (locField) payload[locField.id] = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }

    await submitForm(selectedFormId.value, payload)
    submitted.value = true
  } catch (e) {
    submitError.value = e.message || 'خطا در ارسال فرم'
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  Object.keys(formData).forEach(k => delete formData[k])
  Object.keys(validationErrors).forEach(k => delete validationErrors[k])
  submitted.value = false
  selectedFormId.value = null
  currentForm.value = null
  loadForms()
}

// ─── Tabs ───────────────────────────────────────────
const activeTab = ref('forms')

// ─── Bottom sheet drag / snap ───────────────────────
const SNAPS = { min: 0, mid: 0.5, max: 0.9 }
const snapLabels = [
  { snap: 'min', label: 'کوچک' },
  { snap: 'mid', label: 'نیمه' },
  { snap: 'max', label: 'کامل' },
]
const currentSnap = ref('mid')
const dragging = ref(false)
const dragY = ref(null)
const sheetEl = ref(null)

const HANDLE_H = 64
const windowH = ref(window.innerHeight)

function snapHeight(snap) {
  return Math.round(windowH.value * SNAPS[snap])
}

const sheetStyle = computed(() => {
  const h = dragging.value && dragY.value !== null
    ? Math.max(HANDLE_H, Math.min(dragY.value, windowH.value * 0.95))
    : snapHeight(currentSnap.value)
  return { height: `${Math.max(HANDLE_H, h)}px` }
})

const sheetClass = computed(() => ({
  'lpp-sheet--min': currentSnap.value === 'min' && !dragging.value,
  'lpp-sheet--mid': currentSnap.value === 'mid' && !dragging.value,
  'lpp-sheet--max': currentSnap.value === 'max' && !dragging.value,
  'lpp-sheet--dragging': dragging.value,
}))

function snapTo(snap) {
  currentSnap.value = snap
  dragging.value = false
  dragY.value = null
}

let dragStartClientY = 0
let dragStartHeight = 0

function startDrag(e) {
  dragging.value = true
  dragStartClientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  dragStartHeight = sheetEl.value?.offsetHeight || snapHeight(currentSnap.value)
  dragY.value = dragStartHeight
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', endDrag)
}

function onDrag(e) {
  if (!dragging.value) return
  if (e.cancelable) e.preventDefault()
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
  const delta = dragStartClientY - clientY
  dragY.value = dragStartHeight + delta
}

function endDrag() {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', endDrag)
  if (dragY.value === null) { dragging.value = false; return }
  const current = dragY.value
  let best = 'mid'
  let bestDist = Infinity
  for (const [snap, ratio] of Object.entries(SNAPS)) {
    const d = Math.abs(snapHeight(snap) - current)
    if (d < bestDist) { bestDist = d; best = snap }
  }
  currentSnap.value = best
  dragging.value = false
  dragY.value = null
}
window.addEventListener('resize', () => { windowH.value = window.innerHeight })

// ─── Lifecycle ──────────────────────────────────────
function close() {
  emit('update:visible', false)
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) {
    activeTab.value = 'forms'
    submitted.value = false
    selectedFormId.value = null
    currentForm.value = null
    loadForms()
  }
})
</script>

<style scoped>
.lpp-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: transparent;
  display: flex; align-items: flex-end; justify-content: center;
}

/* ── Sheet ── */
.lpp-sheet {
  position: relative; width: 100%;
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
  will-change: height;
}
.lpp-sheet--min, .lpp-sheet--mid, .lpp-sheet--max { transition: height 0.32s cubic-bezier(.32,1,.23,1); }
.lpp-sheet--dragging { transition: none; }

/* Handle */
.lpp-handle-area { flex-shrink: 0; cursor: grab; user-select: none; padding: 8px 16px 4px; }
.lpp-handle-area:active { cursor: grabbing; }
.lpp-handle { width: 40px; height: 4px; border-radius: 2px; background: var(--border); margin: 0 auto 8px; }
.lpp-header { display: flex; align-items: center; justify-content: space-between; }
.lpp-title-wrap { display: flex; align-items: center; gap: 10px; }
.lpp-close {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px;
}
.lpp-close:hover { color: var(--danger); border-color: var(--danger); }
.lpp-title { font-size: 14px; font-weight: 600; color: var(--text); }
.lpp-snaps { display: flex; gap: 6px; }
.lpp-snap-btn {
  font-family: var(--font); font-size: 11px; padding: 3px 10px;
  border-radius: 12px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.lpp-snap-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

/* Tabs */
.lpp-tabs { display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--border); }
.lpp-tab {
  flex: 1; font-family: var(--font); font-size: 13px; padding: 10px 8px;
  background: transparent; border: none; color: var(--text-muted); cursor: pointer;
  border-bottom: 2px solid transparent; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.lpp-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* Body */
.lpp-body { flex: 1; overflow-y: auto; padding: 14px 16px 32px; }
.lpp-tab-pane { animation: fade .2s ease; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

/* States */
.lpp-state { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-muted); margin-top: 30px; text-align: center; }
.lpp-state.error { color: var(--danger); }
.lpp-state-icon { font-size: 36px; }
.lpp-spinner-lg {
  width: 36px; height: 36px; border: 3px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%; animation: lpp-spin .8s linear infinite;
}
.lpp-spinner-sm {
  width: 14px; height: 14px; border: 2px solid var(--border);
  border-top-color: #fff; border-radius: 50%; animation: lpp-spin .7s linear infinite; display: inline-block;
}
@keyframes lpp-spin { to { transform: rotate(360deg); } }

/* Forms list */
.lpp-forms-list { display: flex; flex-direction: column; gap: 10px; }
.lpp-form-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; font-family: var(--font); text-align: right; color: var(--text); transition: all .18s;
}
.lpp-form-item:hover { border-color: var(--accent); transform: translateY(-1px); }
.lpp-form-icon { font-size: 22px; flex-shrink: 0; }
.lpp-form-body { flex: 1; }
.lpp-form-title { font-size: 15px; font-weight: 600; }
.lpp-form-desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.lpp-form-arrow { color: var(--text-muted); font-size: 18px; }

/* Form view */
.lpp-back {
  display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px;
  background: transparent; border: none; color: var(--accent); font-family: var(--font);
  font-size: 13px; cursor: pointer;
}
.lpp-form-head { margin-bottom: 12px; }
.lpp-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.lpp-badge.on { background: rgba(62,207,142,.12); color: var(--success); }
.lpp-badge.off { background: rgba(255,85,114,.12); color: var(--danger); }
.lpp-form-name { font-size: 18px; font-weight: 700; margin: 6px 0; }
.lpp-form-sub { color: var(--text-muted); font-size: 13px; }

/* Coords */
.lpp-coords-bar { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 4px; }
.lpp-coord-item { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.lpp-coord-label { font-size: 11px; color: var(--text-muted); }
.lpp-input, .lpp-textarea, .lpp-select {
  width: 100%; font-family: var(--font); font-size: 13px; padding: 8px 10px;
  background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius);
}
.lpp-input:focus, .lpp-textarea:focus, .lpp-select:focus { outline: none; border-color: var(--accent); }
.lpp-input.error { border-color: var(--danger); }
.lpp-textarea { min-height: 80px; resize: vertical; }
.lpp-input::-webkit-inner-spin-button, .lpp-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.lpp-btn-icon { flex-shrink: 0; width: 38px; height: 38px; font-size: 16px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface2); color: var(--text); cursor: pointer; }

.lpp-divider { height: 1px; background: var(--border); margin: 14px 0; }

/* Fields */
.lpp-field-group { margin-bottom: 16px; }
.lpp-field-label { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 6px; display: block; }
.lpp-required { color: var(--danger); margin-right: 2px; }
.lpp-help { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.lpp-field-error { font-size: 12px; color: var(--danger); margin-top: 4px; }
.lpp-radio-group, .lpp-checkbox-group { display: flex; flex-direction: column; gap: 8px; }
.lpp-radio-label, .lpp-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }

/* Submit */
.lpp-submit-section { margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border); }
.lpp-submit-btn { width: 100%; justify-content: center; padding: 12px; font-size: 15px; }
.lpp-submit-error { color: var(--danger); font-size: 13px; margin-bottom: 10px; padding: 8px 12px; background: rgba(255,85,114,.1); border-radius: var(--radius); border: 1px solid rgba(255,85,114,.2); }

/* Success */
.lpp-success { text-align: center; padding: 30px 0; }
.lpp-success-icon { font-size: 48px; margin-bottom: 12px; }
.lpp-success h3 { font-size: 20px; margin-bottom: 14px; }

/* Buttons */
.lpp-btn { font-family: var(--font); padding: 8px 16px; border-radius: var(--radius); border: 1px solid transparent; cursor: pointer; font-size: 13px; }
.lpp-btn:disabled { opacity: .6; cursor: not-allowed; }
.lpp-btn-ghost { background: transparent; border-color: var(--border); color: var(--text-muted); }
.lpp-btn-ghost:hover { color: var(--text); }
.lpp-btn-success { background: var(--success); color: #06281b; font-weight: 600; }
.lpp-btn-icon-wide { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); border-radius: var(--radius); cursor: pointer; font-family: var(--font); font-size: 14px; margin-top: 14px; }

/* Location tab */
.lpp-loc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.lpp-loc-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.lpp-loc-label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 6px; }
.lpp-loc-val { font-size: 16px; font-family: monospace; color: var(--accent); direction: ltr; display: block; }
.lpp-loc-hint { font-size: 12px; color: var(--text-muted); margin: 14px 0; line-height: 1.8; }

/* Slide transition */
.sheet-slide-enter-active, .sheet-slide-leave-active { transition: opacity .25s ease; }
.sheet-slide-enter-from, .sheet-slide-leave-to { opacity: 0; }
.sheet-slide-enter-active .lpp-sheet, .sheet-slide-leave-active .lpp-sheet {
  transition: transform .3s cubic-bezier(.32,1,.23,1);
}
.sheet-slide-enter-from .lpp-sheet, .sheet-slide-leave-to .lpp-sheet { transform: translateY(100%); }

@media (max-width: 768px) {
  .lpp-body { padding: 12px 12px 28px; }
  .lpp-form-title { font-size: 14px; }
  .lpp-title { font-size: 13px; }
}
</style>
