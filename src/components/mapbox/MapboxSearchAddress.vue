<template>
  <div>
    <button
        @click="togglePanel"
        class= 'absolute top-[calc(var(--top)+115px)] left-[12px] w-8 h-8 bg-gray-200 rounded flex items-center justify-center shadow-md'
        title="جستجوی آدرس">
      <i class="fas fa-search m-1"></i>
    </button>

    <transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="transform translate-x-full"
        enter-to-class="transform translate-x-0"
        leave-active-class="transition-transform duration-300 ease-in"
        leave-from-class="transform translate-x-0"
        leave-to-class="transform translate-x-full">

      <div v-if="isOpen" class="fixed top-0 left-0 w-full h-full z-[1000]" @click="closePanel">
        <div
            class="fixed top-0 right-0 w-[340px] h-full bg-white shadow-2xl z-50 overflow-y-auto"
            dir="rtl"
            @click.stop>

          <div class="p-6">
            <div class="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 class="text-lg font-bold text-gray-500 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                جستجو
              </h2>
              <button @click="closePanel" class="text-gray-700 hover:text-gray-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="mb-4 flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                @click="activeTab = 'address'"
                :class="[
                  'flex-1 py-2 text-sm rounded-md transition',
                  activeTab === 'address'
                    ? 'bg-white text-accent shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
              >
                آدرس
              </button>
              <button
                @click="activeTab = 'coords'"
                :class="[
                  'flex-1 py-2 text-sm rounded-md transition',
                  activeTab === 'coords'
                    ? 'bg-white text-accent shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
              >
                مختصات
              </button>
              <button
                disabled
                class="flex-1 py-2 text-sm rounded-md bg-white/60 text-gray-400 opacity-60 cursor-not-allowed"
                title="به‌زودی"
              >
                کد نوسازی
              </button>
            </div>

            <div v-if="activeTab === 'address'">
              <div class="mb-4">
                <div class="flex gap-2">
                <div class="flex-1 relative">
                  <input type="text" v-model="searchText" @keyup.enter="performSearch"
                    placeholder="متن جستجو را وارد کنید..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    :disabled="loading" />
                  <div v-if="searchText && !loading" class="absolute left-2 top-2.5">
                    <button @click="clearSearch" class="text-gray-400 hover:text-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <button @click="performSearch" :disabled="loading"
                    class="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <details class="mb-4">
              <summary class="cursor-pointer text-accent hover:text-accent text-sm font-medium">فیلترهای پیشرفته</summary>
              <div class="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">فیلتر شهر:</label>
                  <input v-model="filters.city" placeholder="مثال: تهران" class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">نوع جستجو:</label>
                  <select v-model="filters.select" class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">همه موارد</option>
                    <option value="roads">جاده‌ها</option>
                    <option value="poi">نقاط دیدنی</option>
                    <option value="roads,poi">جاده‌ها و نقاط دیدنی</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">تعداد نتایج:</label>
                  <select v-model="filters.top" class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent">
                    <option :value="10">۱۰ نتیجه</option>
                    <option :value="20">۲۰ نتیجه</option>
                    <option :value="50">۵۰ نتیجه</option>
                    <option :value="100">۱۰۰ نتیجه</option>
                  </select>
                </div>
              </div>
            </details>

            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-center gap-2 text-red-700 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{{ error }}</span>
              </div>
            </div>

            <div v-if="results.length > 0" class="mt-4">
              <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-semibold text-gray-800">نتایج ({{ results.length }})</h3>
                <button @click="clearResults" class="text-xs text-red-600 hover:text-red-700">پاک کردن</button>
              </div>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div v-for="(item, index) in results" :key="index" @click="flyToLocation(item)"
                    class="p-3 bg-gray-50 rounded-lg hover:bg-accent/15 transition-colors cursor-pointer border border-gray-200 hover:border-accent-soft">
                  <div class="flex items-start gap-2">
                    <div class="flex-shrink-0 mt-1">
                      <div class="w-6 h-6 bg-accent/15 rounded-full flex items-center justify-center">
                        <svg class="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900 text-sm">{{ item.title || item.name || 'بدون عنوان' }}</h4>
                      <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ item.address || item.formatted_address || 'بدون آدرس' }}</p>
                      <div v-if="item.geom" class="mt-2 flex flex-wrap gap-3 text-xs">
                        <span class="text-gray-500">Lat: {{ formatCoordinate(item.geom.coordinates[0]) }}</span>
                        <span class="text-gray-500">Lng: {{ formatCoordinate(item.geom.coordinates[1]) }}</span>
                      </div>
                      <div v-if="item.type" class="mt-1">
                        <span class="inline-block px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">{{ item.type }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p class="mt-2 text-sm text-gray-600">در حال جستجو...</p>
            </div>

            <div v-if="!loading && !error && searched && results.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="mt-2 text-sm text-gray-500">نتیجه‌ای یافت نشد</p>
            </div>
            </div>

            <div v-else-if="activeTab === 'coords'" class="space-y-3">
              <p class="text-[11px] text-gray-500 leading-relaxed">
                مختصات جغرافیایی را وارد کنید تا آدرس (شهر، خیابان و …) نمایش داده شود.
              </p>

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
                    <label class="block text-[10px] text-gray-500 mb-1">عرض جغرافیایی (lat)</label>
                    <input v-model="manual.lat" type="text" dir="ltr" class="w-full border rounded px-2 py-1 text-xs font-mono" placeholder="35.6892" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1">طول جغرافیایی (lon)</label>
                    <input v-model="manual.lon" type="text" dir="ltr" class="w-full border rounded px-2 py-1 text-xs font-mono" placeholder="51.3890" />
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1">Easting</label>
                    <input v-model="manual.easting" type="text" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1">Northing</label>
                    <input v-model="manual.northing" type="text" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1">Zone</label>
                    <input v-model.number="manual.zone" type="number" min="1" max="60" dir="ltr" class="w-full border rounded px-1 py-1 text-xs font-mono" />
                  </div>
                </div>
              </template>

              <button
                type="button"
                @click="performCoordSearch"
                :disabled="loading"
                class="w-full py-2 bg-accent text-white rounded-lg hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ loading ? 'در حال دریافت…' : 'یافتن آدرس' }}
              </button>

              <div v-if="coordError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center gap-2 text-red-700 text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{{ coordError }}</span>
                </div>
              </div>

              <div v-if="coordAddress" class="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5 text-[11px]">
                <div class="font-medium text-gray-800">{{ coordAddress.display || 'آدرس یافت شد' }}</div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-600">
                  <span v-if="coordAddress.country"><b>کشور:</b> {{ coordAddress.country }}</span>
                  <span v-if="coordAddress.province"><b>استان:</b> {{ coordAddress.province }}</span>
                  <span v-if="coordAddress.city"><b>شهر:</b> {{ coordAddress.city }}</span>
                  <span v-if="coordAddress.district"><b>منطقه:</b> {{ coordAddress.district }}</span>
                  <span v-if="coordAddress.neighbourhood" class="col-span-2"><b>محله:</b> {{ coordAddress.neighbourhood }}</span>
                  <span v-if="coordAddress.road" class="col-span-2"><b>خیابان:</b> {{ coordAddress.road }}</span>
                  <span v-if="coordAddress.house_number"><b>پلاک:</b> {{ coordAddress.house_number }}</span>
                  <span v-if="coordAddress.postcode"><b>کدپستی:</b> {{ coordAddress.postcode }}</span>
                </div>
                <div v-if="lastCoord" class="text-gray-400 font-mono pt-1 border-t" dir="ltr">
                  {{ lastCoord.lat.toFixed(6) }}, {{ lastCoord.lon.toFixed(6) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl';
import proj4 from 'proj4';

const props = defineProps({
  map: { type: Object, required: true }
})

const emit = defineEmits(['location-selected'])

const isOpen = ref(false)
const searchText = ref('')
const loading = ref(false)
const results = ref([])
const error = ref(null)
const searched = ref(false)
let searchMarker = null

const activeTab = ref('address')
const coordSystem = ref('latlon')
const manual = reactive({
  lat: '',
  lon: '',
  easting: '',
  northing: '',
  zone: 39,
})
const coordError = ref('')
const coordAddress = ref(null)
const lastCoord = ref(null)
let coordMarker = null

const filters = ref({ city: '', select: '', top: 20 })

const formatCoordinate = (coord) => {
  if (!coord) return 'نامشخص'
  return typeof coord === 'number' ? coord.toFixed(6) : coord
}

const buildRequestBody = () => {
  const body = { text: searchText.value }
  let filterParts = []
  if (filters.value.city) filterParts.push(`city eq ${filters.value.city}`)
  if (filterParts.length > 0) body['$filter'] = filterParts.join(' and ')
  if (filters.value.select) body['$select'] = filters.value.select
  if (filters.value.top) body['$top'] = filters.value.top
  return body
}

const performSearch = async () => {
  if (!searchText.value.trim()) { error.value = 'لطفا متن جستجو را وارد کنید'; return }
  loading.value = true; error.value = null; searched.value = true
  try {
    const response = await fetch('https://map.ir/search/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_MAP_IR_KEY
      },
      body: JSON.stringify(buildRequestBody())
    })
    if (!response.ok) throw new Error(`خطا ${response.status}: ${response.statusText}`)
    const data = await response.json()
    results.value = data.value || data.results || data.data || []
    if (results.value.length === 0) error.value = 'نتیجه‌ای یافت نشد'
  } catch (err) {
    error.value = err.message || 'خطا در ارتباط با سرور'
    results.value = []
  } finally { loading.value = false }
}

const flyToLocation = (item) => {
  if (!props.map || !item.geom) return
  const lat = item.geom.coordinates[1]
  const lng = item.geom.coordinates[0]

  props.map.flyTo({ center: [lng, lat], zoom: 16, essential: true })

  if (searchMarker) searchMarker.remove()
  searchMarker = new mapboxgl.Marker({ color: 'red' })
    .setLngLat([lng, lat])
    .setPopup(new mapboxgl.Popup().setText(item.title || item.name || 'مکان انتخاب شده'))
    .addTo(props.map)

  emit('location-selected', { location: { lat, lng }, item })
}

const togglePanel = () => { isOpen.value = !isOpen.value }
const closePanel = () => { isOpen.value = false }
const clearSearch = () => { searchText.value = ''; results.value = []; searched.value = false; error.value = null }
const clearResults = () => { results.value = []; searched.value = false; error.value = null }

const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY

function placeCoordMarker(lon, lat) {
  if (!props.map) return
  if (coordMarker) coordMarker.remove()
  coordMarker = new mapboxgl.Marker({ color: '#ea580c' })
    .setLngLat([lon, lat])
    .addTo(props.map)
  props.map.flyTo({ center: [lon, lat], zoom: Math.max(props.map.getZoom(), 15), essential: true })
}

function performCoordSearch() {
  coordError.value = ''
  coordAddress.value = null
  let lat, lon
  if (coordSystem.value === 'latlon') {
    lat = parseFloat(manual.lat)
    lon = parseFloat(manual.lon)
    if (!isFinite(lat) || !isFinite(lon)) {
      coordError.value = 'مختصات معتبر نیست'
      return
    }
  } else {
    const e = parseFloat(manual.easting)
    const n = parseFloat(manual.northing)
    const z = Number(manual.zone) || 39
    if (!isFinite(e) || !isFinite(n)) {
      coordError.value = 'مختصات UTM معتبر نیست'
      return
    }
    try {
      ;[lon, lat] = proj4(
        `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,
        'EPSG:4326',
        [e, n],
      )
    } catch (err) {
      coordError.value = 'تبدیل UTM ناموفق بود'
      return
    }
  }
  reverseLookup(lat, lon)
}

async function reverseLookup(lat, lon) {
  loading.value = true
  coordError.value = ''
  coordAddress.value = null
  lastCoord.value = { lat, lon }
  placeCoordMarker(lon, lat)
  try {
    const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-api-key': MAP_IR_KEY,
      },
    })
    if (!res.ok) throw new Error('خطا در سرویس آدرس (' + res.status + ')')
    const data = await res.json()
    const a = data.address || data || {}
    coordAddress.value = {
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
    if (!coordAddress.value.display) {
      coordAddress.value.display = [coordAddress.value.province, coordAddress.value.city, coordAddress.value.neighbourhood, coordAddress.value.road]
        .filter(Boolean)
        .join('، ') || 'آدرس یافت شد'
    }
  } catch (err) {
    coordError.value = err.message || 'دریافت آدرس ناموفق بود'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (searchMarker) searchMarker.remove()
  if (coordMarker) coordMarker.remove()
})
</script>
