<template>
  <div class="page">
    <h1 class="page-title" style="margin-bottom: 24px">تنظیمات</h1>

    <div class="settings-grid">
      <div class="setting-card card">
        <div class="setting-top">
          <div>
            <h3 class="setting-label">سیستم مختصات</h3>
            <p class="setting-desc">انتخاب بین UTM یا CGS</p>
          </div>
          <ToggleSwitch v-model="settings.isUTM" />
        </div>
        <p class="setting-info">حالت فعلی: <b>{{ coordinateSystem }}</b></p>
      </div>

      <div class="setting-card card">
        <h3 class="setting-label" style="margin-bottom:10px">مختصات اولیه نقشه</h3>
        <div class="coord-row">
          <input v-model.number="settings.lat" type="number" placeholder="Latitude" class="input" />
          <input v-model.number="settings.lng" type="number" placeholder="Longitude" class="input" />
        </div>
      </div>

      <div class="setting-card card">
        <h3 class="setting-label" style="margin-bottom:10px">بیس اولیه نقشه</h3>
        <select v-model="settings.base_map" class="input">
          <option value="google">Google</option>
          <option value="satellite">Satellite</option>
          <option value="osm">OSM</option>
        </select>
      </div>

      <div class="setting-card card">
        <div class="setting-top">
          <div>
            <h3 class="setting-label">پنل لایه پیش‌فرض</h3>
            <p class="setting-desc">باز یا بسته بودن پنل لایه‌ها</p>
          </div>
          <ToggleSwitch v-model="settings.layers_open" />
        </div>
      </div>

      <div class="setting-card card">
        <div class="setting-top">
          <div>
            <h3 class="setting-label">نمایش موقعیت موس</h3>
            <p class="setting-desc">نمایش مختصات مکان‌نما روی نقشه</p>
          </div>
          <ToggleSwitch v-model="settings.show_point" />
        </div>
      </div>

      <div class="setting-card card">
        <div class="setting-top">
          <div>
            <h3 class="setting-label">تأیید کاربر ثبت‌ نامی</h3>
            <p class="setting-desc">نیاز به تأیید مدیر هنگام ثبت‌ نام</p>
          </div>
          <ToggleSwitch v-model="settings.verify" />
        </div>
      </div>
    </div>

    <div style="margin-top: 24px; text-align: center;">
      <button @click="save" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import ToggleSwitch from "../components/ToggleSwitch.vue"
import { loadSettings, saveSettings } from '../utils/settings';
import { useNotify } from '../composables/useNotify'

const { success, handleError } = useNotify()
const settings = ref({});
const saving = ref(false);
const isUTM = ref(true)
const coordinateSystem = computed(() => isUTM.value ? "UTM" : "CGS")

onMounted(async () => {
  settings.value = await loadSettings();
});

async function save() {
  saving.value = true;
  try {
    await saveSettings(settings.value);
    success('تنظیمات با موفقیت ذخیره شد');
  } catch (e) {
    handleError(e);
  } finally { saving.value = false; }
}
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.setting-card { padding: 20px; }
.setting-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.setting-label { font-size: 14px; font-weight: 600; }
.setting-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.setting-info { font-size: 13px; color: var(--text-muted); margin-top: 8px; }
.coord-row { display: flex; gap: 10px; }
.coord-row .input { flex: 1; }
.setting-msg { font-size: 13px; margin-top: 10px; }
.msg-ok { color: var(--success); }
.msg-err { color: var(--danger); }
@media (max-width: 768px) {
  .settings-grid { grid-template-columns: 1fr; gap: 10px; }
  .setting-card { padding: 14px; }
  .setting-label { font-size: 13px; }
  .coord-row { flex-direction: column; gap: 8px; }
}
@media (max-width: 480px) {
  .setting-top { flex-direction: column; gap: 8px; }
}
</style>

