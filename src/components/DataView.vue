<template>
  <!-- دکمه باز/بستن شناور -->
  <button
      class="fixed bottom-3 right-[100px] bg-gray-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-11 text-sm"  @click="togglePanel">
    نمونه
  </button>

  <div class="fixed inset-0 flex items-center justify-center bg-black/40 z-40">
    <div class="bg-white w-11/12 md:w-3/4 lg:w-2/3 h-[600px] rounded-md shadow-2xl border flex flex-col overflow-hidden">

      <div class="flex justify-between items-center p-4 border-b bg-gray-50 sticky top-0 z-10">
        <h2 class="text-xl font-bold">
          رکوردها ({{ workspace }}:{{ layer }})
        </h2>
        <!--        <button @click="togglePanel" class="text-gray-700 font-bold text-lg px-2 py-1 rounded hover:bg-gray-200">-->
        <!--          ✖-->
        <!--        </button>-->
        <slot name="close" />
      </div>

      <!-- Search Input -->
      <div class="p-4 border-b bg-gray-50 sticky top-[56px] z-10">
        <input  type="text" v-model="searchQuery"  placeholder="جستجو..." class="w-full border rounded px-3 py-1 text-sm"/>
      </div>

      <!-- Table Contents  -->
      <div class="overflow-y-auto flex-1 p-4" style="padding-top: 0">
        <div v-if="loading" class="text-gray-500">در حال بارگذاری...</div>
        <!--        <div v-else-if="error" class="text-red-600">{{ error }}</div>-->

        <table v-else class="table-auto w-full text-sm border-collapse">
          <thead>
          <tr>
            <th v-for="(val, key) in features[0]" :key="key" class="border-b p-2 text-left bg-gray-100 sticky top-0">
              {{ key }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(feat, i) in pagedFeatures" :key="i" class="hover:bg-gray-50">
            <td v-for="(val, key) in feat" :key="key" class="p-2 border-b">{{ val }}</td>
          </tr>
          </tbody>
        </table>

        <div v-if="!filteredFeatures.length && !loading" class="text-gray-500 mt-2 text-center">هیچ رکوردی یافت نشد.</div>
      </div>

      <!-- Footer Table -->
      <div class="flex justify-between items-center p-4 border-t bg-gray-50">
        <button @click="prevPage" :disabled="currentPage===1" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
          ▶ قبلی
        </button>
        <span>صفحه {{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage===totalPages" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
          بعدی ◀
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch , onMounted } from "vue"

const props = defineProps({
  workspace: { type: String, required: true },
  layer: { type: String, required: true },
  geoserverUrl: { type: String, default: import.meta.env.VITE_GEOSERVER ? import.meta.env.VITE_GEOSERVER + '/geoserver' : '/geoserver' },
  pageSize: { type: Number, default: 10 }
})

const features = ref([])
const filteredFeatures = ref([])
const loading = ref(false)
const error = ref(null)
const currentPage = ref(1)
const searchQuery = ref("")

onMounted(() => {
 if (props.workspace && props.layer) fetchFeatures()
})

watch(
   [() => props.workspace, () => props.layer],
   ([newWorkspace, newLayer], [oldWorkspace, oldLayer]) => {
     if (newWorkspace !== oldWorkspace || newLayer !== oldLayer) {
       fetchFeatures()
     }
   }
);

const fetchFeatures = async () => {
  if (!props.workspace || !props.layer) return
  loading.value = true
  error.value = null
  try {
    const url = `${props.geoserverUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${props.workspace}:${props.layer}&maxFeatures=500&outputFormat=application/json`
    const res = await fetch(url)
    if (!res.ok) throw new Error("خطا در دریافت داده‌ها")
    const data = await res.json()
    features.value = data.features.map(f => f.properties)
    filteredFeatures.value = features.value
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const pagedFeatures = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return filteredFeatures.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredFeatures.value.length / props.pageSize))

const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }

watch(searchQuery, (val) => {
  if (!val) {
    filteredFeatures.value = features.value
  } else {
    const q = val.toLowerCase()
    filteredFeatures.value = features.value.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
    )
  }
  currentPage.value = 1
})
</script>
