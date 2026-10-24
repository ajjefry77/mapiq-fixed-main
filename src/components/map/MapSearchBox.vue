<template>
  <div ref="rootEl" class="map-search-box" dir="rtl" @keydown.esc="open = false">
    <!-- فیلد جستجو (کپسول شناور) -->
    <div
      class="map-search-field"
      :class="{ 'map-search-field--open': open }"
      @click="expand"
    >
      <button
        class="map-search-toggle"
        @click.stop="open = !open"
        :title="open ? 'بستن جستجو' : 'جستجو'"
      >
        <i :class="open ? 'fas fa-times' : 'fas fa-search'"></i>
      </button>

      <input
        ref="inputEl"
        v-model="searchText"
        v-if="activeTab === 'address'"
        type="text"
        @focus="open = true"
        @keyup.enter="performSearch"
        placeholder="جستجوی آدرس در سراسر کشور…"
        class="map-search-input"
        :disabled="loading"
      />
      <span v-else class="map-search-input map-search-input--ghost">
        جستجوی مختصات
      </span>

      <button
        v-if="searchText && !loading"
        class="map-search-clear"
        @click.stop="clearSearch"
        title="پاک کردن"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- پنل باز شونده به سمت پایین -->
    <transition name="search-expand">
      <div v-if="open" class="map-search-panel" @click.stop>
        <!-- تب‌ها -->
        <div class="map-search-tabs">
          <button
            v-for="tab in [
              { key: 'address', label: 'آدرس' },
              { key: 'coords', label: 'مختصات' },
            ]"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="['map-search-tab', { 'map-search-tab--active': activeTab === tab.key }]"
          >
            {{ tab.label }}
          </button>
          <button
            disabled
            class="map-search-tab"
            title="به‌زودی"
          >
            کد نوسازی
          </button>
        </div>

        <!-- تب آدرس -->
        <div v-if="activeTab === 'address'">
          <button
            @click="performSearch"
            :disabled="loading || !searchText.trim()"
            class="map-search-go"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-search"></i>
            جستجو
          </button>

          <details class="map-search-filters">
            <summary>فیلترهای پیشرفته</summary>
            <div class="map-search-filters-body">
              <div>
                <label>فیلتر شهر:</label>
                <input v-model="filters.city" placeholder="مثال: تهران" />
              </div>
              <div>
                <label>نوع جستجو:</label>
                <select v-model="filters.select">
                  <option value="">همه موارد</option>
                  <option value="roads">جاده‌ها</option>
                  <option value="poi">نقاط دیدنی</option>
                  <option value="roads,poi">جاده‌ها و نقاط دیدنی</option>
                </select>
              </div>
              <div>
                <label>تعداد نتایج:</label>
                <select v-model="filters.top">
                  <option :value="10">۱۰ نتیجه</option>
                  <option :value="20">۲۰ نتیجه</option>
                  <option :value="50">۵۰ نتیجه</option>
                  <option :value="100">۱۰۰ نتیجه</option>
                </select>
              </div>
            </div>
          </details>

          <!-- خطا -->
          <div v-if="error" class="map-search-error">
            <i class="fas fa-triangle-exclamation"></i>
            <span>{{ error }}</span>
          </div>

          <!-- نتایج -->
          <div v-if="results.length > 0" class="map-search-results">
            <div class="map-search-results-head">
              <h4>نتایج ({{ results.length }})</h4>
              <button @click="clearResults">پاک کردن</button>
            </div>
            <div
              v-for="(item, index) in results"
              :key="index"
              @click="flyToLocation(item)"
              class="map-search-result"
            >
              <div class="map-search-result-icon">
                <i class="fas fa-location-dot"></i>
              </div>
              <div class="map-search-result-body">
                <h5>{{ item.title || item.name || 'بدون عنوان' }}</h5>
                <p>{{ item.address || item.formatted_address || 'بدون آدرس' }}</p>
              </div>
            </div>
          </div>

          <div v-if="!loading && !error && searched && results.length === 0" class="map-search-empty">
            <i class="fas fa-face-frown"></i>
            <p>نتیجه‌ای یافت نشد</p>
          </div>
        </div>

        <!-- تب مختصات -->
        <div v-else-if="activeTab === 'coords'" class="map-search-coords">
          <p class="map-search-hint">مختصات را وارد کنید تا آدرس نمایش داده شود.</p>

          <div class="map-search-coord-switch">
            <button
              type="button"
              @click="coordSystem = 'latlon'"
              :class="{ 'map-search-coord-switch--active': coordSystem === 'latlon' }"
            >Lat/Lon</button>
            <button
              type="button"
              @click="coordSystem = 'utm'"
              :class="{ 'map-search-coord-switch--active': coordSystem === 'utm' }"
            >UTM</button>
          </div>

          <template v-if="coordSystem === 'latlon'">
            <div class="map-search-coord-grid grid-2">
              <div>
                <label>عرض جغرافیایی (lat)</label>
                <input v-model="manual.lat" type="text" dir="ltr" placeholder="35.6892" />
              </div>
              <div>
                <label>طول جغرافیایی (lon)</label>
                <input v-model="manual.lon" type="text" dir="ltr" placeholder="51.3890" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="map-search-coord-grid grid-3">
              <div>
                <label>Easting</label>
                <input v-model="manual.easting" type="text" dir="ltr" />
              </div>
              <div>
                <label>Northing</label>
                <input v-model="manual.northing" type="text" dir="ltr" />
              </div>
              <div>
                <label>Zone</label>
                <input v-model.number="manual.zone" type="number" min="1" max="60" dir="ltr" />
              </div>
            </div>
          </template>

          <button
            type="button"
            @click="performCoordSearch"
            :disabled="loading"
            class="map-search-go w-full"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            {{ loading ? 'در حال دریافت…' : 'یافتن آدرس' }}
          </button>

          <div v-if="coordError" class="map-search-error">
            <i class="fas fa-triangle-exclamation"></i>
            <span>{{ coordError }}</span>
          </div>

          <div v-if="coordAddress" class="map-search-addr-card">
            <div class="map-search-addr-display">{{ coordAddress.display || 'آدرس یافت شد' }}</div>
            <div class="map-search-addr-fields">
              <span v-if="coordAddress.province"><b>استان:</b> {{ coordAddress.province }}</span>
              <span v-if="coordAddress.city"><b>شهر:</b> {{ coordAddress.city }}</span>
              <span v-if="coordAddress.road"><b>خیابان:</b> {{ coordAddress.road }}</span>
              <span v-if="coordAddress.house_number"><b>پلاک:</b> {{ coordAddress.house_number }}</span>
              <span v-if="coordAddress.postcode"><b>کدپستی:</b> {{ coordAddress.postcode }}</span>
            </div>
            <div v-if="lastCoord" class="map-search-addr-coords" dir="ltr">
              {{ lastCoord.lat.toFixed(6) }}, {{ lastCoord.lon.toFixed(6) }}
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, onMounted, nextTick } from "vue";
import mapboxgl from "mapbox-gl";
import proj4 from "proj4";

const props = defineProps({
  /** نمونه نقشه Mapbox (فعال در تب 2D) */
  map: { type: Object, default: null },
  /** نمونه Viewer فریم‌ورک سه‌بعدی (فعال در تب 3D) */
  viewer: { type: Object, default: null },
});

const open = ref(false);
const inputEl = ref(null);
const rootEl = ref(null);
const searchText = ref("");
const loading = ref(false);
const results = ref([]);
const error = ref(null);
const searched = ref(false);
let searchMarker = null;

const activeTab = ref("address");
const coordSystem = ref("latlon");
const manual = reactive({
  lat: "",
  lon: "",
  easting: "",
  northing: "",
  zone: 39,
});
const coordError = ref("");
const coordAddress = ref(null);
const lastCoord = ref(null);
let coordMarker = null;

const filters = ref({ city: "", select: "", top: 20 });

const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY;

function expand() {
  open.value = true;
  nextTick(() => inputEl.value?.focus());
}

const buildRequestBody = () => {
  const body = { text: searchText.value };
  const filterParts = [];
  if (filters.value.city) filterParts.push(`city eq ${filters.value.city}`);
  if (filterParts.length > 0) body["$filter"] = filterParts.join(" and ");
  if (filters.value.select) body["$select"] = filters.value.select;
  if (filters.value.top) body["$top"] = filters.value.top;
  return body;
};

const performSearch = async () => {
  if (!searchText.value.trim()) {
    error.value = "لطفا متن جستجو را وارد کنید";
    return;
  }
  open.value = true;
  loading.value = true;
  error.value = null;
  searched.value = true;
  try {
    const response = await fetch("https://map.ir/search/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": MAP_IR_KEY,
      },
      body: JSON.stringify(buildRequestBody()),
    });
    if (!response.ok) throw new Error(`خطا ${response.status}: ${response.statusText}`);
    const data = await response.json();
    results.value = data.value || data.results || data.data || [];
    if (results.value.length === 0) error.value = "نتیجه‌ای یافت نشد";
  } catch (err) {
    error.value = err.message || "خطا در ارتباط با سرور";
    results.value = [];
  } finally {
    loading.value = false;
  }
};

const flyToLocation = (item) => {
  if (!item.geom) return;
  const lat = item.geom.coordinates[1];
  const lng = item.geom.coordinates[0];
  const title = item.title || item.name || "مکان انتخاب شده";

  if (props.map) {
    props.map.flyTo({ center: [lng, lat], zoom: 16, essential: true });
    if (searchMarker) searchMarker.remove();
    searchMarker = new mapboxgl.Marker({ color: "red" })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setText(title))
      .addTo(props.map);
  } else if (props.viewer) {
    props.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 4000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 2,
    });
  }
};

const clearSearch = () => {
  searchText.value = "";
  results.value = [];
  searched.value = false;
  error.value = null;
};

const clearResults = () => {
  results.value = [];
  searched.value = false;
  error.value = null;
};

function placeCoordMarker(lon, lat) {
  if (props.map) {
    if (coordMarker) coordMarker.remove();
    coordMarker = new mapboxgl.Marker({ color: "#ea580c" })
      .setLngLat([lon, lat])
      .addTo(props.map);
  } else if (props.viewer) {
    props.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 5000),
      duration: 1.5,
    });
    return;
  }
  props.map?.flyTo({
    center: [lon, lat],
    zoom: Math.max(props.map.getZoom(), 15),
    essential: true,
  });
}

function performCoordSearch() {
  coordError.value = "";
  coordAddress.value = null;
  let lat, lon;
  if (coordSystem.value === "latlon") {
    lat = parseFloat(manual.lat);
    lon = parseFloat(manual.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      coordError.value = "مختصات معتبر نیست";
      return;
    }
  } else {
    const e = parseFloat(manual.easting);
    const n = parseFloat(manual.northing);
    const z = Number(manual.zone) || 39;
    if (!isFinite(e) || !isFinite(n)) {
      coordError.value = "مختصات UTM معتبر نیست";
      return;
    }
    try {
      [lon, lat] = proj4(
        `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,
        "EPSG:4326",
        [e, n],
      );
    } catch (err) {
      coordError.value = "تبدیل UTM ناموفق بود";
      return;
    }
  }
  reverseLookup(lat, lon);
}

async function reverseLookup(lat, lon) {
  loading.value = true;
  coordError.value = "";
  coordAddress.value = null;
  lastCoord.value = { lat, lon };
  placeCoordMarker(lon, lat);
  try {
    const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": MAP_IR_KEY,
      },
    });
    if (!res.ok) throw new Error("خطا در سرویس آدرس (" + res.status + ")");
    const data = await res.json();
    const a = data.address || data || {};
    coordAddress.value = {
      display:
        data.address_compact ||
        data.address ||
        data.postal_address ||
        data.last ||
        [a.province, a.city, a.neighbourhood, a.primary].filter(Boolean).join("، ") ||
        data.display_name ||
        "",
      province: a.province || data.province || a.state || "",
      city: a.city || data.city || a.county || data.county || "",
      road: a.primary || a.road || data.primary || data.road || a.last || "",
      house_number: a.plaque || a.house_number || data.plaque || "",
      postcode: a.postal_code || a.postcode || data.postal_code || "",
    };
    if (!coordAddress.value.display) {
      coordAddress.value.display =
        [coordAddress.value.province, coordAddress.value.city, coordAddress.value.road]
          .filter(Boolean)
          .join("، ") || "آدرس یافت شد";
    }
  } catch (err) {
    coordError.value = err.message || "دریافت آدرس ناموفق بود";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onOutsideClick);
});

function onOutsideClick(e) {
  if (!open.value) return;
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false;
}

onUnmounted(() => {
  document.removeEventListener("pointerdown", onOutsideClick);
  if (searchMarker) searchMarker.remove();
  if (coordMarker) coordMarker.remove();
});
</script>

<style scoped>
.map-search-box {
  width: 320px;
  max-width: 100%;
}

/* فیلد کپسولی */
.map-search-field {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 8px 0 12px;
  border-radius: 9999px;
  background: rgba(19, 21, 30, 0.88);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: text;
  transition: border-color 0.18s ease-out, box-shadow 0.18s ease-out;
}

.map-search-field--open {
  border-radius: 9999px;
  border-color: rgba(232, 132, 60, 0.5);
}

.map-search-toggle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.map-search-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent, #e8843c);
}

.map-search-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text, #fff);
  font-family: var(--font, inherit);
  font-size: 13px;
  padding: 0;
}

.map-search-input--ghost {
  color: var(--text-muted, #9ca3af);
  cursor: default;
  white-space: nowrap;
}

.map-search-clear {
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
}

.map-search-clear:hover {
  color: #fff;
}

/* پنل باز شونده */
.map-search-panel {
  margin-top: 8px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(19, 21, 30, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.map-search-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 10px;
}

.map-search-tab {
  flex: 1;
  padding: 6px 4px;
  font-size: 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  font-family: var(--font, inherit);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.map-search-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-search-tab--active {
  background: rgba(19, 21, 30, 0.95);
  color: var(--accent, #e8843c);
  font-weight: 600;
}

.map-search-go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 10px;
  border: none;
  background: var(--accent, #e8843c);
  color: #fff;
  font-family: var(--font, inherit);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
  margin-top: 8px;
}

.map-search-go:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.map-search-go:hover:not(:disabled) {
  filter: brightness(1.08);
}

.map-search-filters {
  margin-top: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.map-search-filters summary {
  padding: 7px 10px;
  font-size: 12px;
  color: var(--accent, #e8843c);
  cursor: pointer;
  user-select: none;
}

.map-search-filters-body {
  padding: 10px;
  background: rgba(10, 10, 15, 0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-search-filters-body label {
  display: block;
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 3px;
}

.map-search-filters-body input,
.map-search-filters-body select {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text, #fff);
  font-family: var(--font, inherit);
  outline: none;
}

.map-search-filters-body input:focus,
.map-search-filters-body select:focus {
  border-color: var(--accent, #e8843c);
}

.map-search-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.map-search-results {
  margin-top: 12px;
}

.map-search-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.map-search-results-head h4 {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text, #fff);
}

.map-search-results-head button {
  font-size: 11px;
  color: #f87171;
  background: none;
  border: none;
  cursor: pointer;
}

.map-search-results > div + .map-search-result {
  margin-top: 6px;
}

.map-search-result {
  display: flex;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 12px;
  background: rgba(10, 10, 15, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.map-search-result:hover {
  background: rgba(232, 132, 60, 0.12);
  border-color: rgba(232, 132, 60, 0.5);
}

.map-search-result-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232, 132, 60, 0.15);
  color: var(--accent, #e8843c);
  font-size: 11px;
}

.map-search-result-body {
  min-width: 0;
}

.map-search-result-body h5 {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-search-result-body p {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.map-search-empty {
  padding: 22px 0;
  text-align: center;
  color: var(--text-muted, #9ca3af);
  font-size: 12.5px;
}

.map-search-empty i {
  font-size: 26px;
  margin-bottom: 8px;
  display: block;
}

.map-search-hint {
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.8;
}

.map-search-coord-switch {
  display: flex;
  gap: 4px;
  margin: 8px 0;
}

.map-search-coord-switch button {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 7px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.map-search-coord-switch--active {
  background: rgba(232, 132, 60, 0.18);
  color: var(--text, #fff);
}

.map-search-coord-grid {
  display: grid;
  gap: 8px;
}

.grid-2 {
  grid-template-columns: 1fr 1fr;
}

.grid-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.map-search-coord-grid label {
  display: block;
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 3px;
}

.map-search-coord-grid input {
  width: 100%;
  padding: 5px 8px;
  font-size: 11.5px;
  font-family: ui-monospace, monospace;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text, #fff);
  outline: none;
}

.map-search-coord-grid input:focus {
  border-color: var(--accent, #e8843c);
}

.map-search-addr-card {
  margin-top: 10px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(10, 10, 15, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 11px;
}

.map-search-addr-display {
  font-weight: 600;
  color: var(--text, #fff);
  margin-bottom: 6px;
}

.map-search-addr-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
  color: var(--text-muted, #9ca3af);
}

.map-search-addr-coords {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-family: ui-monospace, monospace;
  color: var(--text-muted, #9ca3af);
}

/* انیمیشن باز شدن به سمت پایین */
.search-expand-enter-active,
.search-expand-leave-active {
  transition: opacity 0.22s ease-out, transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
  transform-origin: top center;
}

.search-expand-enter-from,
.search-expand-leave-to {
  opacity: 0;
  transform: scaleY(0.9) translateY(-8px);
}
</style>
