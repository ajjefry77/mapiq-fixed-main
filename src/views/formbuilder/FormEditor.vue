<template>
  <div class="editor-layout">
    <aside class="palette card">
      <h3 class="palette-title"><i class="fas fa-shapes"></i> افزودن فیلد <span class="palette-count">{{ FIELD_TYPES.length }}</span></h3>
      <p class="palette-hint">کلیک کنید تا به فرم اضافه شود</p>
      <button v-for="ft in FIELD_TYPES" :key="ft.type" class="palette-item" @click="addField(ft.type)">
        <span class="palette-ic"><Icon :icon="ft.icon" width="18" height="18" /></span>
        <span class="palette-label">{{ ft.label }}</span>
        <i class="fas fa-plus palette-plus"></i>
      </button>
    </aside>

    <main class="canvas">
      <div class="canvas-header card">
        <div class="ch-top">
          <span class="chip-live"><span class="pulse"></span> در حال ویرایش</span>
          <span class="chip-count">{{ faNum(fields.length) }} فیلد</span>
        </div>
        <input v-model="formTitle" class="input form-title-input" placeholder="عنوان فرم..." />
        <input v-model="formDescription" class="input" placeholder="توضیحات فرم (اختیاری) — برای پاسخ‌دهنده نمایش داده می‌شود" style="margin-top:8px" />
        <div class="ch-row">
          <label class="ch-field">
            <span><i class="fas fa-users"></i> گروه</span>
            <select v-model="formGroupId" class="select-native">
              <option :value="null">بدون گروه (همه)</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </label>
          <label class="ch-field ch-toggle">
            <span><i class="fas fa-toggle-on"></i> وضعیت</span>
            <span class="switch-wrap"><input type="checkbox" v-model="isActive" class="switch" /> <b>{{ isActive ? 'فعال' : 'غیرفعال' }}</b></span>
          </label>
        </div>
      </div>

      <div v-if="!fields.length" class="empty-canvas card">
        <div class="empty-art"><Icon icon="mdi:form-select" width="40" height="40" /></div>
        <h3>فرم شما خالی است</h3>
        <p>از پنل سمت راست یک نوع فیلد انتخاب کنید<br />بعد ترتیب‌شان را با درگ تغییر دهید</p>
      </div>

      <div v-else class="fields-list">
        <div v-for="(field, idx) in fields" :key="field.id"
          class="field-row card"
          :class="{ 'field-row--selected': selectedFieldId === field.id, 'field-row--dragover': dragOverIndex === idx }"
          draggable="true"
          @click="selectField(field.id)"
          @dragstart="onDragStart(idx)"
          @dragover.prevent="dragOverIndex = idx"
          @dragleave="dragOverIndex = null"
          @drop="onDrop(idx)"
          @dragend="dragOverIndex = null">
          <span class="order-num">{{ faNum(idx + 1) }}</span>
          <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
          <div class="field-preview">
            <div class="field-label-row">
              <span class="type-ic"><Icon :icon="FIELD_TYPES.find(f => f.type === field.type)?.icon || 'mdi:help-circle-outline'" width="16" height="16" /></span>
              <strong>{{ field.label }}</strong>
              <span v-if="field.required" class="required-star">*</span>
              <span class="type-name">{{ FIELD_TYPES.find(f => f.type === field.type)?.label }}</span>
            </div>
            <div class="field-sub">{{ field.placeholder || typeHint(field) }}</div>
            <div v-if="field.options?.length" class="opt-chips">
              <span v-for="(o,i) in field.options.slice(0,3)" :key="i" class="opt-chip">{{ o }}</span>
              <span v-if="field.options.length > 3" class="opt-chip opt-more">+{{ faNum(field.options.length - 3) }}</span>
            </div>
          </div>
          <div class="field-row-actions">
            <button class="mini-btn" title="کپی" @click.stop="duplicateField(field.id)"><Icon icon="mdi:content-copy" width="16" height="16" /></button>
            <button class="mini-btn danger" title="حذف" @click.stop="removeField(field.id)"><Icon icon="mdi:delete-outline" width="16" height="16" /></button>
          </div>
        </div>
      </div>
      <div style="height:80px"></div>
    </main>

    <aside class="properties card" v-if="selectedField">
      <h3 class="properties-title"><span><i class="fas fa-sliders-h"></i> تنظیمات فیلد</span><button class="props-close" title="بستن" @click="closeProperties"><i class="fas fa-times"></i></button></h3>
      <div class="prop-type">{{ FIELD_TYPES.find(f=>f.type===selectedField.type)?.label }} <span v-if="selectedField.required" class="required-star">*</span></div>
      <div class="prop-group">
        <label>برچسب</label>
        <input class="input" :value="selectedField.label" @input="updateField(selectedField.id, { label: $event.target.value })" placeholder="مثلاً نام و نام خانوادگی" />
      </div>
      <div class="prop-group">
        <label>متن راهنما (placeholder)</label>
        <input class="input" :value="selectedField.placeholder" @input="updateField(selectedField.id, { placeholder: $event.target.value })" placeholder="مثلاً بنویسید..." />
      </div>
      <div class="prop-group">
        <label>توضیح کمکی</label>
        <input class="input" :value="selectedField.helpText" @input="updateField(selectedField.id, { helpText: $event.target.value })" placeholder="توضیح زیر فیلد" />
      </div>
      <div class="prop-group prop-toggle">
        <label>فیلد اجباری باشد</label>
        <label class="switch-wrap"><input type="checkbox" class="switch" :checked="selectedField.required" @change="updateField(selectedField.id, { required: $event.target.checked })" /></label>
      </div>
      <div v-if="['select','radio','checkbox'].includes(selectedField.type)" class="prop-group">
        <label>گزینه‌ها</label>
        <div v-for="(opt, i) in selectedField.options" :key="i" class="option-row">
          <span class="opt-num">{{ faNum(i+1) }}</span>
          <input class="input" :value="opt" @input="updateOption(selectedField.id, i, $event.target.value)" />
          <button class="mini-btn danger" @click="removeOption(selectedField.id, i)"><Icon icon="mdi:delete-outline" width="15" height="15" /></button>
        </div>
        <button class="btn btn-ghost btn-xs" style="margin-top:8px" @click="addOption(selectedField.id)"><i class="fas fa-plus"></i> افزودن گزینه</button>
      </div>
    </aside>
    <aside class="properties properties--empty card" v-else>
      <div class="empty-props"><i class="fas fa-mouse-pointer"></i><p>یک فیلد را انتخاب کنید<br />تا تنظیمات آن اینجا نمایش داده شود</p></div>
    </aside>
  </div>

  <div class="save-bar">
    <div class="save-bar-inner">
      <span class="save-hint"><i class="fas fa-info-circle"></i> تغییرات ذخیره نشده دارید؟ دکمه ذخیره را بزنید</span>
      <div style="display:flex;gap:8px">
        <router-link to="/forms" class="btn btn-ghost btn-sm">انصراف</router-link>
        <button class="btn btn-primary btn-sm save-btn" :disabled="saving" @click="save"><i class="fas fa-save"></i> {{ saving ? 'در حال ذخیره...' : (isEdit ? 'ذخیره تغییرات' : 'ایجاد فرم') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForms } from '../../composables/fb/useForms.js'
import { useFormBuilder } from '../../composables/fb/useFormBuilder.js'
import { useGroups } from '../../composables/fb/useGroups.js'
import { useNotify } from '../../composables/useNotify'

const route = useRoute()
const router = useRouter()
const { fetchForm, createForm, updateForm } = useForms()
const { groups, fetchGroups } = useGroups()
const { success, handleError, error: toastError } = useNotify()
const isEdit = computed(() => !!route.params.id)

const formTitle = ref('فرم بدون عنوان')
const formDescription = ref('')
const formGroupId = ref(null)
const isActive = ref(true)
const saving = ref(false)
let dragFromIndex = null

const { fields, selectedFieldId, selectedField, dragOverIndex, FIELD_TYPES, addField, removeField, selectField, updateField, moveField, duplicateField, addOption, removeOption, updateOption } = useFormBuilder([])

function faNum(n){ try{ return Number(n).toLocaleString('fa-IR') }catch{ return n } }
function typeHint(f){
  const m = { text:'متن کوتاه', textarea:'پاراگراف بلند', number:'عدد وارد کنید…', email:'example@mail.com', phone:'0912…', date:'تاریخ انتخاب می‌شود', select:'یک گزینه انتخاب می‌شود', radio:'تک‌انتخابی', checkbox:'چندانتخابی', file:'فایل ضمیمه می‌شود', location:'موقعیت خودکار ثبت می‌شود' }
  return m[f.type] || f.type
}

onMounted(async () => {
  await fetchGroups()
  if (isEdit.value) {
    const form = await fetchForm(route.params.id)
    formTitle.value = form.title
    formDescription.value = form.description || ''
    formGroupId.value = (form.group_id === null || form.group_id === undefined) ? null : Number(form.group_id)
    isActive.value = form.is_active
    fields.value = form.fields || []
  }
})

function onDragStart(idx) { dragFromIndex = idx }
function closeProperties() { selectedFieldId.value = null }
function onDrop(toIdx) {
  if (dragFromIndex !== null && dragFromIndex !== toIdx) moveField(dragFromIndex, toIdx)
  dragFromIndex = null
  dragOverIndex.value = null
}

async function save() {
  if (!formTitle.value.trim()) { toastError('عنوان فرم الزامی است'); return }
  saving.value = true
  try {
    const gid = formGroupId.value
    const normalizedGroupId = (gid === null || gid === undefined || gid === '') ? null : Number(gid)
    const payload = { title: formTitle.value, description: formDescription.value, group_id: normalizedGroupId, fields: fields.value, is_active: isActive.value }
    if (!isEdit.value) payload.created_at = new Date().toISOString()
    if (isEdit.value) await updateForm(route.params.id, payload)
    else await createForm(payload)
    success(isEdit.value ? 'فرم بروزرسانی شد' : 'فرم جدید ایجاد شد')
    router.push('/forms')
  } catch (e) {
    handleError(e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.editor-layout { display: grid; grid-template-columns: 230px 1fr 280px; gap: 14px; padding: 16px 20px; min-height: calc(100vh - 56px - 64px); align-items: start; }
.palette { padding: 16px 12px; position: sticky; top: 76px; max-height: calc(100vh - 160px); overflow-y: auto; }
.palette-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; display: flex; align-items: center; gap: 7px; }
.palette-title i { color: var(--accent-soft); }
.palette-count { margin-right: auto; font-size: 11px; background: var(--accent-glow); border: 1px solid rgba(232,132,60,.3); color: var(--accent-soft); border-radius: 999px; padding: 0 8px; }
.palette-hint { font-size: 11px; color: var(--text-faint); margin-bottom: 12px; }
.palette-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 9px; margin-bottom: 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 11px; font-family: var(--font); font-size: 12.5px; font-weight: 600; color: var(--text); cursor: pointer; transition: all .15s; text-align: right; }
.palette-item:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateX(-2px); }
.palette-item:hover .palette-plus { opacity: 1; transform: scale(1); }
.palette-ic { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(232,132,60,.14); color: var(--accent-soft); flex-shrink: 0; }
.palette-label { flex: 1; }
.palette-plus { font-size: 10px; color: var(--accent-soft); opacity: 0; transform: scale(.6); transition: all .15s; }
.canvas { min-width: 0; }
.canvas-header { padding: 18px; margin-bottom: 14px; }
.ch-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.chip-live { font-size: 11px; color: var(--success); background: var(--success-glow); border: 1px solid rgba(62,207,142,.25); padding: 3px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; }
.pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--success); animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(62,207,142,.5);} 50%{ box-shadow: 0 0 0 5px rgba(62,207,142,0);} }
.chip-count { font-size: 11px; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); padding: 3px 10px; border-radius: 999px; }
.form-title-input { font-size: 19px !important; font-weight: 800 !important; padding: 12px 14px !important; }
.ch-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.ch-field { display: flex; flex-direction: column; gap: 6px; }
.ch-field > span { font-size: 12px; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 6px; }
.ch-toggle .switch-wrap { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; min-height: 40px; }
.switch { width: 34px !important; height: 20px !important; appearance: none; background: var(--surface3); border-radius: 999px; position: relative; cursor: pointer; transition: all .2s; border: 1px solid var(--border-strong); }
.switch:checked { background: var(--success); border-color: var(--success); }
.switch::after { content:''; position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: all .2s; }
.switch:checked::after { transform: translateX(-14px); }
.empty-canvas { text-align: center; padding: 56px 20px !important; border-style: dashed !important; border-width: 2px !important; }
.empty-art { width: 76px; height: 76px; border-radius: 22px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: var(--accent-glow); color: var(--accent-soft); border: 1px solid rgba(232,132,60,.3); }
.empty-canvas h3 { font-size: 15px; margin-bottom: 6px; }
.empty-canvas p { font-size: 12.5px; color: var(--text-muted); line-height: 2; }
.fields-list { display: flex; flex-direction: column; gap: 9px; }
.field-row { display: flex; align-items: flex-start; gap: 9px; padding: 12px 13px !important; cursor: pointer; transition: all .15s; }
.field-row:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.field-row--selected { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-glow); }
.field-row--dragover { border-color: var(--warning) !important; transform: scale(1.01); }
.order-num { font-size: 11px; font-weight: 800; color: var(--text-faint); background: var(--surface2); border: 1px solid var(--border); min-width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.field-row--selected .order-num { background: var(--accent); color: #fff; border-color: var(--accent); }
.drag-handle { color: var(--text-faint); cursor: grab; font-size: 15px; padding-top: 3px; }
.drag-handle:active { cursor: grabbing; }
.field-preview { flex: 1; min-width: 0; }
.field-label-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.type-ic { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface3); color: var(--accent-soft); flex-shrink: 0; }
.field-label-row strong { font-size: 13.5px; }
.required-star { color: var(--danger); font-weight: 800; }
.type-name { font-size: 10.5px; color: var(--text-faint); background: var(--surface2); border: 1px solid var(--border); padding: 1px 8px; border-radius: 999px; }
.field-sub { font-size: 11.5px; color: var(--text-faint); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 7px; }
.opt-chip { font-size: 10.5px; background: var(--surface3); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px; color: var(--text-muted); }
.opt-more { color: var(--accent-soft); border-color: rgba(232,132,60,.3); }
.field-row-actions { display: flex; gap: 5px; flex-shrink: 0; }
.mini-btn { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface2); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all .15s; }
.mini-btn:hover { color: var(--text); border-color: var(--border-strong); transform: translateY(-1px); }
.mini-btn.danger:hover { color: #fff; background: var(--danger); border-color: var(--danger); }
.properties { padding: 18px !important; position: sticky; top: 76px; max-height: calc(100vh - 160px); overflow-y: auto; }
.properties--empty { display: flex; align-items: center; justify-content: center; min-height: 300px; text-align: center; color: var(--text-faint); font-size: 12.5px; line-height: 2; }
.empty-props i { font-size: 28px; margin-bottom: 10px; display: block; opacity: .5; }
.properties-title { font-size: 13px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.properties-title i { color: var(--accent-soft); }
.props-close { width: 26px; height: 26px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--text-muted); font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.props-close:hover { color: var(--danger); border-color: var(--danger); }
.prop-type { font-size: 12px; font-weight: 700; color: var(--accent-soft); background: var(--accent-glow); border: 1px solid rgba(232,132,60,.25); border-radius: 9px; padding: 7px 12px; margin-bottom: 14px; text-align: center; }
.prop-group { margin-bottom: 13px; }
.prop-group label { font-size: 12px; }
.prop-toggle { display: flex; justify-content: space-between; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; }
.prop-toggle label { margin: 0; color: var(--text); font-weight: 600; }
.option-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.opt-num { font-size: 11px; color: var(--text-faint); min-width: 20px; text-align: center; }
.save-bar { background: rgba(26,29,39,.9); backdrop-filter: blur(12px); border-top: 1px solid var(--border); min-height: 60px; position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; }
.save-bar-inner { max-width: 1200px; margin: 0 auto; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.save-hint { font-size: 12px; color: var(--text-faint); display: flex; align-items: center; gap: 7px; }
.save-btn { box-shadow: 0 4px 16px var(--accent-glow-strong); }
@media (max-width: 1100px) { .editor-layout { grid-template-columns: 200px 1fr; } .properties { position: fixed; bottom: 60px; left: 0; right: 0; top: auto; max-height: 62vh; z-index: 70; border-radius: 18px 18px 0 0 !important; box-shadow: 0 -12px 40px rgba(0,0,0,.5); } .properties--empty { display: none; } }
@media (max-width: 700px) {
  .editor-layout { grid-template-columns: 1fr; padding: 12px; }
  .palette { position: static; max-height: none; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .palette-title, .palette-hint { width: 100%; }
  .palette-item { width: auto; margin: 0; }
  .palette-item .palette-label { display: none; }
  .palette-plus { display: none; }
  .ch-row { grid-template-columns: 1fr; }
  .save-hint { display: none; }
  .save-bar-inner { justify-content: stretch; } .save-bar-inner > div { width: 100%; } .save-bar-inner .btn { flex: 1; }
}
</style>
