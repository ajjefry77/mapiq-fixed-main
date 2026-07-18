<!--'x-api-key': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1In0.eyJhdWQiOiIyNjc3NSIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1IiwiaWF0IjoxNzExNTIxNTM0LCJuYmYiOjE3MTE1MjE1MzQsImV4cCI6MTcxNDExMzUzNCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.fi9nJpTLqS0UqeRHKx1rtd0H_Eg7Q67WA7RuGOl6ZegLggD3d7Q84G9sxFiRbfbPBcnLQulwnTvAlrjF8RhSW2hwB4L4I5IY3fpn4mRlIH4KqBMbLmhKHpUuqA6E9oGLqnOcIz-f3vTMEZEFf5_eYWnglebM18y-mBgPO6jIfgfTUnvaegSXKYFnV5HaZRMbIOynXLpP9VdCA9Wf5cIqS9nrwN-gufTMyC39T-1MaFIJyFF4bF1OLHdHLzdQ0Pwf5rZ7Z07i9kLhpMMP_84C3_2BHfY6vzwkvMcJNkwjOEbP84mv56pNxJ2ZZv7qxlJ_WghUBHNNaA_Cctpi-7CmSA'-->
<template>
  <div>
    <!-- دکمه باز کردن پنل جستجو -->
<!--    <button-->
<!--        @click="togglePanel"-->
<!--        class="fixed bottom-16 left-4 z-50 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"-->
<!--        :class="{ 'bg-blue-600 text-white': isOpen }"-->
<!--    >-->
<!--      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>-->
<!--      </svg>-->
<!--    </button>-->

    <button
        @click="togglePanel"
        class= 'absolute top-[calc(var(--top)+124px)] left-[12px] w-8 h-8 bg-gray-200 rounded flex items-center justify-center shadow-md'
        title="جستجوی آدرس">
      <i class="fas fa-search m-1"></i>
    </button>

    <!-- پنل جستجو -->

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
            <!-- هدر -->
            <div class="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 class="text-lg font-bold text-gray-500 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                جستجوی آدرس
              </h2>
              <button @click="closePanel" class="text-gray-700 hover:text-gray-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- باکس جستجو -->
            <div class="mb-4">
              <div class="flex gap-2">
                <div class="flex-1 relative">
                  <input
                      type="text"
                      v-model="searchText"
                      @keyup.enter="performSearch"
                      placeholder="متن جستجو را وارد کنید..."
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      :disabled="loading"
                  />
                  <div v-if="searchText && !loading" class="absolute left-2 top-2.5">
                    <button @click="clearSearch" class="text-gray-400 hover:text-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                    @click="performSearch" :disabled="loading"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

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

            <!-- فیلترها -->
            <details class="mb-4">
              <summary class="cursor-pointer text-blue-600 hover:text-blue-700 text-sm font-medium">
                فیلترهای پیشرفته
              </summary>

              <div class="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">فیلتر شهر:</label>
                  <input v-model="filters.city" placeholder="مثال: تهران"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">نوع جستجو:</label>
                  <select v-model="filters.select" class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">همه موارد</option>
                    <option value="roads">جاده‌ها</option>
                    <option value="poi">نقاط دیدنی</option>
                    <option value="roads,poi">جاده‌ها و نقاط دیدنی</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">تعداد نتایج:</label>
                  <select v-model="filters.top" class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option :value="10">۱۰ نتیجه</option>
                    <option :value="20">۲۰ نتیجه</option>
                    <option :value="50">۵۰ نتیجه</option>
                    <option :value="100">۱۰۰ نتیجه</option>
                  </select>
                </div>
              </div>
            </details>

            <!-- خطا -->
            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-center gap-2 text-red-700 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{{ error }}</span>
              </div>
            </div>

            <!-- نتایج -->
            <div v-if="results.length > 0" class="mt-4">
              <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-semibold text-gray-800">نتایج ({{ results.length }})</h3>
                <button @click="clearResults" class="text-xs text-red-600 hover:text-red-700" >
                  پاک کردن
                </button>
              </div>

              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div
                    v-for="(item, index) in results"
                    :key="index"
                    @click="flyToLocation(item)"
                    class="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex-shrink-0 mt-1">
                      <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900 text-sm">{{ item.title || item.name || 'بدون عنوان' }}</h4>
                      <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ item.address || item.formatted_address || 'بدون آدرس' }}</p>

                      <div v-if="item.geom" class="mt-2 flex flex-wrap gap-3 text-xs">
                        <span class="text-gray-500">
                          Lat: {{ formatCoordinate(item.geom.coordinates[0]) }}
                        </span>
                        <span class="text-gray-500">
                          Lng: {{ formatCoordinate(item.geom.coordinates[1]) }}
                        </span>
                      </div>

                      <div v-if="item.type" class="mt-1">
                        <span class="inline-block px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                          {{ item.type }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- وضعیت لودینگ -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p class="mt-2 text-sm text-gray-600">در حال جستجو...</p>
            </div>

            <!-- بدون نتیجه -->
            <div v-if="!loading && !error && searched && results.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="mt-2 text-sm text-gray-500">نتیجه‌ای یافت نشد</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props
const props = defineProps({
  viewer: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['location-selected'])

// State
const isOpen = ref(false)
const searchText = ref('')
const loading = ref(false)
const results = ref([])
const error = ref(null)
const searched = ref(false)

const filters = ref({
  city: '',
  select: '',
  top: 20
})

// Helper functions
const formatCoordinate = (coord) => {
  if (!coord) return 'نامشخص'
  return typeof coord === 'number' ? coord.toFixed(6) : coord
}

const buildRequestBody = () => {
  const body = { text: searchText.value }

  let filterParts = []
  if (filters.value.city) {
    filterParts.push(`city eq ${filters.value.city}`)
  }

  if (filterParts.length > 0) {
    body['$filter'] = filterParts.join(' and ')
  }

  if (filters.value.select) {
    body['$select'] = filters.value.select
  }

  if (filters.value.top) {
    body['$top'] = filters.value.top
  }

  return body
}

const performSearch = async () => {
  if (!searchText.value.trim()) {
    error.value = 'لطفا متن جستجو را وارد کنید'
    return
  }

  loading.value = true
  error.value = null
  searched.value = true

  try {
    const endpoint = 'https://map.ir/search/v2'
    const body = buildRequestBody()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1In0.eyJhdWQiOiIyNjc3NSIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1IiwiaWF0IjoxNzExNTIxNTM0LCJuYmYiOjE3MTE1MjE1MzQsImV4cCI6MTcxNDExMzUzNCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.fi9nJpTLqS0UqeRHKx1rtd0H_Eg7Q67WA7RuGOl6ZegLggD3d7Q84G9sxFiRbfbPBcnLQulwnTvAlrjF8RhSW2hwB4L4I5IY3fpn4mRlIH4KqBMbLmhKHpUuqA6E9oGLqnOcIz-f3vTMEZEFf5_eYWnglebM18y-mBgPO6jIfgfTUnvaegSXKYFnV5HaZRMbIOynXLpP9VdCA9Wf5cIqS9nrwN-gufTMyC39T-1MaFIJyFF4bF1OLHdHLzdQ0Pwf5rZ7Z07i9kLhpMMP_84C3_2BHfY6vzwkvMcJNkwjOEbP84mv56pNxJ2ZZv7qxlJ_WghUBHNNaA_Cctpi-7CmSA'      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`خطا ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    results.value = data.value || data.results || data.data || []

    if (results.value.length === 0) {
      error.value = 'نتیجه‌ای یافت نشد'
    }

  } catch (err) {
    error.value = err.message || 'خطا در ارتباط با سرور'
    console.error('Search error:', err)
    results.value = []
  } finally {
    loading.value = false
  }
}

const flyToLocation = (item) => {
  if (!props.viewer || !item.geom) return

  const lat = item.geom.coordinates[1]
  const lng = item.geom.coordinates[0]

  // پرواز به موقعیت انتخاب شده در Cesium
  props.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 4000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    },
    duration: 2
  })

  const text = item.title || item.name || 'مکان انتخاب شده';
  // اضافه کردن یک نقطه روی نقشه
  const entity = props.viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 10,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    // label: {
    //   horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
    //   text: text,
    //   font: '14px IranSans',
    //   fillColor: Cesium.Color.BLACK,
    //   outlineColor: Cesium.Color.WHITE,
    //   outlineWidth: 2,
    //   style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    //   verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    //   pixelOffset: new Cesium.Cartesian2(0, -15)
    // }
  })

  // حذف نقطه قبلی (اختیاری)
  if (window.lastSelectedEntity) {
    props.viewer.entities.remove(window.lastSelectedEntity)
  }
  window.lastSelectedEntity = entity

  // ارسال رویداد به کامپوننت والد
  emit('location-selected', {
    location: { lat, lng },
    item: item,
    entity: entity
  })

  // بستن پنل بعد از انتخاب (اختیاری)
  // closePanel()
}

const togglePanel = () => {
  isOpen.value = !isOpen.value
}

const closePanel = () => {
  isOpen.value = false
}

const clearSearch = () => {
  searchText.value = ''
  results.value = []
  searched.value = false
  error.value = null
}

const clearResults = () => {
  results.value = []
  searched.value = false
  error.value = null
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.max-h-96 {
  max-height: 24rem;
}

/* اسکرول بار */
.max-h-96::-webkit-scrollbar {
  width: 6px;
}

.max-h-96::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.max-h-96::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.max-h-96::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>