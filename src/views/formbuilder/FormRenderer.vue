<template>
  <div class="page form-fill-page">
    <div v-if="loading" class="loading card"><span class="loader"></span> در حال بارگذاری فرم...</div>
    <div v-else-if="submitted" class="success-card card">
      <div class="success-ring"><i class="fas fa-check"></i></div>
      <h2>پاسخ شما ثبت شد!</h2>
      <p>ممنون از وقتی که گذاشتید. پاسخ شما با موفقیت برای مدیر فرم ارسال شد.</p>
      <button class="btn btn-ghost btn-sm" style="margin-top:16px" @click="reset"><i class="fas fa-redo"></i> ارسال پاسخ جدید</button>
    </div>
    <div v-else-if="form" class="fill-card card">
      <div class="fill-top"></div>
      <div class="fill-head">
        <div class="fill-ic"><i class="fas fa-file-signature"></i></div>
        <div style="flex:1;min-width:0">
          <div class="fill-badges">
            <span class="badge" :class="form.is_active ? 'badge-active' : 'badge-inactive'"><span class="dot"></span>{{ form.is_active ? 'پذیرش پاسخ فعال' : 'غیرفعال' }}</span>
            <span class="q-count">{{ faNum(form.fields?.length || 0) }} سوال</span>
          </div>
          <h1 class="fill-title">{{ form.title }}</h1>
          <p v-if="form.description" class="fill-desc">{{ form.description }}</p>
        </div>
        <router-link v-if="showEdit" :to="`/forms/${form.id}/edit`" class="btn btn-ghost btn-xs">✏️ ویرایش</router-link>
      </div>

      <div class="progress"><div class="progress-bar" :style="{ width: progressPct + '%' }"></div></div>
      <p class="progress-label">{{ progressLabel }}</p>

      <div class="fields-form">
        <div v-for="(field, idx) in form.fields" :key="field.id" class="field-card" :class="{ 'has-error': errors[field.id] }">
          <label class="field-label">
            <span class="q-num">{{ faNum(idx + 1) }}</span>
            {{ field.label }}
            <span v-if="field.required" class="req">*</span>
            <span v-else class="opt-tag">اختیاری</span>
          </label>

          <input v-if="['text','email','phone','number','date'].includes(field.type)"
            :type="field.type === 'phone' ? 'tel' : field.type"
            :placeholder="field.placeholder || 'پاسخ خود را بنویسید...'"
            v-model="formData[field.id]"
            class="input field-input"
            @input="clearError(field.id)"
          />

          <textarea v-else-if="field.type === 'textarea'"
            :placeholder="field.placeholder || 'توضیح کامل بنویسید...'"
            v-model="formData[field.id]"
            class="textarea field-input"
            rows="3"
            @input="clearError(field.id)"
          />

          <select v-else-if="field.type === 'select'"
            v-model="formData[field.id]"
            class="select-native field-input"
            @change="clearError(field.id)"
          >
            <option value="" disabled>انتخاب کنید...</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <div v-else-if="field.type === 'radio'" class="choice-grid">
            <label v-for="opt in field.options" :key="opt" class="choice-pill" :class="{ 'choice--on': formData[field.id]===opt }">
              <input type="radio" :name="field.id" :value="opt" v-model="formData[field.id]" @change="clearError(field.id)" class="sr" />
              <span class="choice-dot"></span>{{ opt }}
            </label>
          </div>

          <div v-else-if="field.type === 'checkbox'" class="choice-grid">
            <label v-for="opt in field.options" :key="opt" class="choice-pill" :class="{ 'choice--on': (formData[field.id] || []).includes(opt) }">
              <input type="checkbox" :value="opt"
                :checked="(formData[field.id] || []).includes(opt)"
                @change="toggleCheckbox(field.id, opt)" class="sr" />
              <span class="choice-box"><i class="fas fa-check"></i></span>{{ opt }}
            </label>
          </div>

          <div v-else-if="field.type === 'location'" class="location-field">
            <div v-if="formData[field.id]" class="location-display">
              <span class="location-dot"></span>
              <span class="location-coords">
                {{ formData[field.id].lat.toFixed(6) }}، {{ formData[field.id].lng.toFixed(6) }}
              </span>
              <span class="loc-ok"><i class="fas fa-check-circle"></i> ثبت شد</span>
            </div>
            <div v-else class="location-pending">
              <span class="location-spinner"></span>
              در حال دریافت موقعیت مکانی...
            </div>
          </div>

          <div v-else-if="field.type === 'file'" class="file-drop">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>فایل را انتخاب کنید</span>
            <input type="file" class="file-input" />
          </div>

          <p v-if="field.helpText" class="help-text"><i class="fas fa-info-circle"></i> {{ field.helpText }}</p>
          <p v-if="errors[field.id]" class="field-error"><i class="fas fa-exclamation-circle"></i> {{ errors[field.id] }}</p>
        </div>

        <button class="btn btn-primary submit-btn" :disabled="submitting" @click="submit">
          <i v-if="!submitting" class="fas fa-paper-plane"></i>
          {{ submitting ? 'در حال ارسال...' : 'ارسال پاسخ' }}
        </button>
        <p class="secure-note"><i class="fas fa-lock"></i> اطلاعات شما محرمانه می‌ماند</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useFormValidator } from '../../composables/fb/useFormValidator.js'

const props = defineProps({
  form: { type: Object, default: null },
  loading: { type: Boolean, default: true },
  showEdit: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const submitting = ref(false)
const submitted = ref(false)
const formData = reactive({})
const userLocation = ref(null)

const fields = ref([])
const { errors, validate, clearError } = useFormValidator(fields)

function faNum(n){ try{ return Number(n).toLocaleString('fa-IR') }catch{ return n } }
const filledCount = computed(() => {
  if (!props.form?.fields) return 0
  return props.form.fields.filter(f => {
    const v = formData[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object') return true
    return v !== undefined && v !== null && String(v).trim() !== ''
  }).length
})
const progressPct = computed(() => {
  const total = props.form?.fields?.length || 0
  if (!total) return 0
  return Math.round((filledCount.value / total) * 100)
})
const progressLabel = computed(() => {
  const total = props.form?.fields?.length || 0
  if (!total) return ''
  return `${faNum(filledCount.value)} از ${faNum(total)} سوال پاسخ داده شده`
})

onMounted(() => {
  if (props.form) {
    fields.value = props.form.fields || []
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        userLocation.value = loc
        const locField = fields.value.find(f => f.type === 'location')
        if (locField) formData[locField.id] = loc
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
})

function toggleCheckbox(fieldId, opt) {
  if (!formData[fieldId]) formData[fieldId] = []
  const arr = formData[fieldId]
  const i = arr.indexOf(opt)
  if (i === -1) { arr.push(opt); clearError(fieldId) }
  else arr.splice(i, 1)
}

async function submit() {
  if (!validate(formData)) {
    const el = document.querySelector('.field-card.has-error')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  submitting.value = true
  try {
    const payload = { ...formData }
    if (userLocation.value) payload._location = userLocation.value
    emit('submit', payload)
    submitted.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    alert('خطا: ' + e.message)
  } finally {
    submitting.value = false
  }
}

function reset() {
  Object.keys(formData).forEach(k => delete formData[k])
  submitted.value = false
}
</script>

<style scoped>
.form-fill-page { max-width: 640px !important; }
.fill-card { position: relative; overflow: hidden; padding: 0 !important; }
.fill-top { height: 6px; background: linear-gradient(to left, #d9732b, var(--accent-soft), #3ecf8e); }
.fill-head { display: flex; gap: 13px; padding: 22px 22px 6px; align-items: flex-start; }
.fill-ic { width: 48px; height: 48px; border-radius: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#d9732b,var(--accent-soft)); color: #fff; font-size: 19px; box-shadow: 0 6px 18px var(--accent-glow-strong); }
.fill-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; flex-wrap: wrap; }
.badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
.q-count { font-size: 11px; color: var(--text-faint); background: var(--surface2); border: 1px solid var(--border); padding: 3px 9px; border-radius: 999px; }
.fill-title { font-size: 21px; font-weight: 800; line-height: 1.5; }
.fill-desc { color: var(--text-muted); font-size: 13px; margin-top: 4px; line-height: 1.9; }
.progress { height: 6px; background: var(--surface2); border-radius: 999px; margin: 16px 22px 6px; overflow: hidden; }
.progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(to left, var(--accent), var(--success)); transition: width .4s ease; }
.progress-label { font-size: 11px; color: var(--text-faint); padding: 0 22px; }
.fields-form { padding: 14px 22px 22px; }
.field-card { background: rgba(255,255,255,.02); border: 1px solid var(--border); border-radius: 14px; padding: 15px; margin-bottom: 12px; transition: border-color .2s, box-shadow .2s; }
.field-card:focus-within { border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-glow); }
.field-card.has-error { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-glow); }
.field-label { font-size: 13.5px !important; font-weight: 700 !important; color: var(--text) !important; margin-bottom: 10px !important; display: flex !important; align-items: center; gap: 7px; flex-wrap: wrap; }
.q-num { min-width: 24px; height: 24px; padding: 0 6px; border-radius: 8px; background: var(--surface3); border: 1px solid var(--border-strong); color: var(--text-muted); font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
.req { color: var(--danger); font-weight: 800; }
.opt-tag { font-size: 10px; font-weight: 600; color: var(--text-faint); background: var(--surface2); border: 1px solid var(--border); padding: 1px 8px; border-radius: 999px; }
.field-input { background: var(--bg-elevated) !important; }
.field-input:focus { background: var(--surface) !important; }
.choice-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.choice-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; background: var(--bg-elevated); border: 1.5px solid var(--border); border-radius: 12px; padding: 9px 14px; transition: all .15s; font-weight: 500; }
.choice-pill:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.choice--on { border-color: var(--accent) !important; background: var(--accent-glow) !important; color: var(--text); box-shadow: 0 0 0 3px var(--accent-glow); }
.choice-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--text-faint); flex-shrink: 0; position: relative; }
.choice--on .choice-dot { border-color: var(--accent); }
.choice--on .choice-dot::after { content:''; position: absolute; inset: 2px; border-radius: 50%; background: var(--accent); }
.choice-box { width: 18px; height: 18px; border-radius: 6px; border: 2px solid var(--text-faint); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: transparent; flex-shrink: 0; }
.choice--on .choice-box { background: var(--accent); border-color: var(--accent); color: #fff; }
.sr { position: absolute; opacity: 0; pointer-events: none; }
.help-text { font-size: 12px; color: var(--text-muted); margin-top: 8px; display: flex; gap: 6px; align-items: flex-start; line-height: 1.8; }
.help-text i { margin-top: 4px; color: var(--info); }
.submit-btn { width: 100%; margin-top: 6px; justify-content: center; padding: 13px !important; font-size: 15px !important; border-radius: 13px !important; min-height: 50px !important; }
.secure-note { text-align: center; font-size: 11px; color: var(--text-faint); margin-top: 10px; }
.success-card { text-align: center; padding: 56px 24px !important; }
.success-ring { width: 76px; height: 76px; border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #fff; background: linear-gradient(135deg,#2bb57e,var(--success)); box-shadow: 0 0 0 10px var(--success-glow), 0 12px 32px rgba(62,207,142,.35); animation: pop .5s cubic-bezier(.34,1.5,.64,1); }
@keyframes pop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.success-card h2 { font-size: 20px; margin-bottom: 8px; }
.success-card p { color: var(--text-muted); font-size: 13px; line-height: 1.9; }
.loading { text-align: center; padding: 60px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 10px; }
.loader { width: 20px; height: 20px; border: 2.5px solid var(--border-strong); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.location-field { width: 100%; }
.location-display { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--success-glow); border: 1px solid rgba(62,207,142,.3); border-radius: 12px; }
.location-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); flex-shrink: 0; }
.location-coords { font-size: 13px; color: var(--text-muted); direction: ltr; font-family: monospace; flex: 1; }
.loc-ok { font-size: 11px; color: var(--success); font-weight: 700; }
.location-pending { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; color: var(--text-muted); font-size: 13px; }
.location-spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
.file-drop { position: relative; border: 2px dashed var(--border-strong); border-radius: 12px; padding: 22px; text-align: center; color: var(--text-muted); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all .15s; overflow: hidden; }
.file-drop:hover { border-color: var(--accent); background: var(--accent-glow); }
.file-drop i { font-size: 24px; color: var(--accent-soft); }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
@media (max-width:600px){ .fill-head{padding:16px 16px 4px} .fields-form{padding:12px 16px 16px} .fill-title{font-size:18px} }
</style>
