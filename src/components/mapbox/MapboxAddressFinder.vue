<template>
  <div class="contents">
    <button
      v-if="!hideTrigger"
      @click="toggle"
      class="absolute top-[calc(var(--top)+200px)] left-[12px] w-9 h-9 rounded flex items-center justify-center shadow-lg z-[80] border border-gray-300"
      :class="active ? 'bg-accent text-white' : 'bg-white text-orange-600'"
      title="آدرس‌یاب (کلیک روی نقشه یا مختصات)"
    >
      <i class="fas fa-map-marker-alt text-base"></i>
    </button>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed top-[calc(var(--top,56px)+150px)] left-12 z-[900] w-72 max-w-[calc(100vw-3rem)] bg-white rounded-lg shadow-2xl border border-gray-200 text-sm"
        dir="rtl"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
          <h3 class="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
            <i class="fas fa-map-marker-alt text-accent"></i>
            آدرس‌یاب
          </h3>
          <button @click="close" class="text-gray-500 hover:text-gray-800 text-sm">✕</button>
        </div>

        <div class="p-3 space-y-3">
          <p class="text-[11px] text-gray-500 leading-relaxed">
            روی نقشه کلیک کنید یا مختصات را دستی وارد کنید تا آدرس (شهر، خیابان و …) نمایش داده شود.
          </p>

          <div class="flex gap-1">
            <button
              type="button"
              @click="pickMode = true"
              :class="[
                'flex-1 py-1.5 text-xs rounded border transition',
                pickMode ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 hover:bg-gray-50',
              ]"
            >
              <i class="fas fa-hand-pointer ml-1"></i>
              کلیک روی نقشه
            </button>
            <button
              type="button"
              @click="pickMode = false"
              :class="[
                'flex-1 py-1.5 text-xs rounded border transition',
                !pickMode ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 hover:bg-gray-50',
              ]"
            >
              مختصات دستی
            </button>
          </div>

          <div v-if="!pickMode" class="space-y-2">
            <div class="flex gap-1 text-[11px]">
              <button
                type="button"
                @click="coordSystem = 'latlon'"
                :class="coordSystem === 'latlon' ? 'bg-gray-800 text-white' : 'bg-gray-100'"
                class="px-2 py-0.5 rounded"
              >Lat/Lon</button>
              <button
                type="button"
                @click="coordSystem = 'utm'"
                :class="coordSystem === 'utm' ? 'bg-gray-800 text-white' : 'bg-gray-100'"
                class="px-2 py-0.5 rounded"
              >UTM</button>
            </div>
            <template v-if="coordSystem === 'latlon'">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] text-gray-500">عرض (lat)</label>
                  <input v-model="manual.lat" type="text" dir="ltr" class="w-full border rounded px-2 py-1 text-xs font-mono" placeholder="35.6892" />
                </div>
                <div>
                  <label class="text-[10px] text-gray-500">طول (lon)</label>
                  <input v-model="manual.lon" type="text" dir="ltr" class="w-full border rounded px-2 py-1 text-xs font-mono" placeholder="51.3890" />
                </div>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-3 gap-1">
                <div>
                  <label class="text-[10px] text-gray-500">Easting</label>
                  <input v-model="manual.easting" type="text" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                </div>
                <div>
                  <label class="text-[10px] text-gray-500">Northing</label>
                  <input v-model="manual.northing" type="text" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                </div>
                <div>
                  <label class="text-[10px] text-gray-500">Zone</label>
                  <input v-model.number="manual.zone" type="number" min="1" max="60" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                </div>
              </div>
            </template>
            <button
              type="button"
              @click="lookupManual"
              :disabled="loading"
              class="w-full py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
            >
              {{ loading ? 'در حال دریافت…' : 'یافتن آدرس' }}
            </button>
          </div>

          <div v-else class="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded p-2">
            حالت انتخاب فعال است — روی نقشه کلیک کنید.
          </div>

          <div v-if="error" class="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded p-2">{{ error }}</div>

          <div v-if="address" class="bg-gray-50 border rounded p-2 space-y-1.5 text-[11px]">
            <div class="font-medium text-gray-800">{{ address.display || 'آدرس یافت شد' }}</div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-600">
              <span v-if="address.country"><b>کشور:</b> {{ address.country }}</span>
              <span v-if="address.province"><b>استان:</b> {{ address.province }}</span>
              <span v-if="address.city"><b>شهر:</b> {{ address.city }}</span>
              <span v-if="address.district"><b>منطقه:</b> {{ address.district }}</span>
              <span v-if="address.neighbourhood" class="col-span-2"><b>محله:</b> {{ address.neighbourhood }}</span>
              <span v-if="address.road" class="col-span-2"><b>خیابان:</b> {{ address.road }}</span>
              <span v-if="address.house_number"><b>پلاک:</b> {{ address.house_number }}</span>
              <span v-if="address.postcode"><b>کدپستی:</b> {{ address.postcode }}</span>
            </div>
            <div class="text-gray-400 font-mono pt-1 border-t" dir="ltr">
              {{ coordLabel }}
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import proj4 from 'proj4'

const props = defineProps({
  map: { type: Object, required: true },
  hideTrigger: { type: Boolean, default: false },
})

const open = ref(false)
const active = computed(() => open.value)
const pickMode = ref(true)
const loading = ref(false)
const error = ref('')
const address = ref(null)
const lastCoord = ref(null)
const coordSystem = ref('latlon')
const manual = reactive({
  lat: '',
  lon: '',
  easting: '',
  northing: '',
  zone: 39,
})

let marker = null
let clickHandler = null

const coordLabel = computed(() => {
  const c = lastCoord.value
  if (!c) return ''
  return `${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`
})

function toggle() {
  open.value = !open.value
  if (!open.value) stopPick()
  else if (pickMode.value) startPick()
}

function openPanel() {
  open.value = true
  if (pickMode.value) startPick()
}

defineExpose({ openPanel, close, toggle })


function close() {
  open.value = false
  stopPick()
}

watch(pickMode, (v) => {
  if (!open.value) return
  if (v) startPick()
  else stopPick()
})

function startPick() {
  if (!props.map || clickHandler) return
  props.map.getCanvas().style.cursor = 'crosshair'
  clickHandler = (e) => {
    const { lng, lat } = e.lngLat
    reverseLookup(lat, lng)
  }
  props.map.on('click', clickHandler)
}

function stopPick() {
  if (clickHandler && props.map) {
    props.map.off('click', clickHandler)
    clickHandler = null
  }
  try {
    if (props.map) props.map.getCanvas().style.cursor = ''
  } catch (_) {}
}

function placeMarker(lon, lat) {
  if (!props.map) return
  if (marker) marker.remove()
  marker = new mapboxgl.Marker({ color: '#ea580c' })
    .setLngLat([lon, lat])
    .addTo(props.map)
  props.map.flyTo({ center: [lon, lat], zoom: Math.max(props.map.getZoom(), 15), essential: true })
}

function lookupManual() {
  error.value = ''
  let lat, lon
  if (coordSystem.value === 'latlon') {
    lat = parseFloat(manual.lat)
    lon = parseFloat(manual.lon)
  } else {
    const e = parseFloat(manual.easting)
    const n = parseFloat(manual.northing)
    const z = Number(manual.zone) || 39
    if (!isFinite(e) || !isFinite(n)) {
      error.value = 'مختصات UTM معتبر نیست'
      return
    }
    try {
      ;[lon, lat] = proj4(
        `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,
        'EPSG:4326',
        [e, n],
      )
    } catch (err) {
      error.value = 'تبدیل UTM ناموفق بود'
      return
    }
  }
  if (!isFinite(lat) || !isFinite(lon)) {
    error.value = 'مختصات معتبر نیست'
    return
  }
  reverseLookup(lat, lon)
}

const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY

async function reverseLookup(lat, lon) {
  loading.value = true
  error.value = ''
  address.value = null
  lastCoord.value = { lat, lon }
  placeMarker(lon, lat)
  try {
    // map.ir reverse — در CSP مجاز است (نه nominatim)
    const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-api-key': MAP_IR_KEY,
      },
    })
    if (!res.ok) throw new Error('خطا در سرویس آدرس (' + res.status + ')')
    const data = await res.json()
    // پاسخ map.ir معمولاً شامل address / province / city / neighbourhood / primary است
    const a = data.address || data || {}
    address.value = {
      display:
        data.address_compact ||
        data.address ||
        data.postal_address ||
        data.last ||
        [a.province, a.city, a.neighbourhood, a.primary].filter(Boolean).join('، ') ||
        data.display_name ||
        '',
      country: a.country || data.country || 'ایران',
      province: a.province || data.province || a.state || '',
      city: a.city || data.city || a.county || data.county || '',
      district: a.district || data.district || a.region || '',
      neighbourhood: a.neighbourhood || data.neighbourhood || a.suburb || '',
      road: a.primary || a.road || data.primary || data.road || a.last || '',
      house_number: a.plaque || a.house_number || data.plaque || '',
      postcode: a.postal_code || a.postcode || data.postal_code || '',
    }
    if (!address.value.display) {
      address.value.display = [address.value.province, address.value.city, address.value.neighbourhood, address.value.road]
        .filter(Boolean)
        .join('، ') || 'آدرس یافت شد'
    }
  } catch (err) {
    error.value = err.message || 'دریافت آدرس ناموفق بود'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  stopPick()
  if (marker) marker.remove()
})
</script>
