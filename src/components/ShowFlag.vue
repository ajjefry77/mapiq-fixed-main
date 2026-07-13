<template>
<!--  <div class="fixed bottom-5 left-5 flex flex-col gap-3 z-40">-->

    <!-- دکمه نمایش/مخفی کردن نقاط -->
<!--    <button-->
<!--        @click="togglePoints"-->
<!--        class="px-4 py-2 rounded-lg shadow bg-blue-600 text-white flex items-center gap-2"-->
<!--    >-->
<!--      <span v-if="pointsVisible">👁️</span>-->
<!--      <span v-else>🕶️</span>-->
<!--      نقاط روی نقشه-->
<!--    </button>-->

<!--    &lt;!&ndash; دکمه لیست &ndash;&gt;-->
<!--    <button-->
<!--        @click="showList = true"-->
<!--        class="px-4 py-2 rounded-lg shadow bg-green-600 text-white"-->
<!--    >-->
<!--      لیست نقاط-->
<!--    </button>-->
<!--  </div>-->

  <div class="absolute bg-[var(--primary-color)] top-[10px] right-96 flex z-10 border border-gray-300 rounded-lg">

     <button
        @click="togglePoints()"
        class="bg-[var(--primary-color)] text-white  rounded-lg px-2 py-1 shadow transition hover:bg-blue-400"
        title="مخفی / نمایش">
      <i :class="pointsVisible ? 'fas fa-eye m-1' : 'fas fa-eye-slash m-1'"></i>
    </button>

    <button
        @click=" showList = true"
        class="bg-[var(--primary-color)] text-white rounded-lg px-3 py-1 shadow transition hover:bg-blue-400"
        title="لیست پین ها">
      <i class="fas fa-list m-1"></i>
    </button>

    <button
        @click="reload()"
        class="bg-[var(--primary-color)] text-white rounded-lg px-3 py-1 shadow transition hover:bg-blue-400"
        title="لیست پین ها">
      <i class="fas fa-refresh"></i>
    </button>
  </div>


  <!-- ===========================
       📌 لیست نقاط (Table)
       =========================== -->
  <div
      v-if="showList"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
  >
    <div class="bg-white w-[700px] max-h-[80vh] overflow-y-auto rounded-xl shadow-lg p-5">

      <h2 class="text-xl font-bold mb-4 text-right">لیست نقاط</h2>

      <!-- جستجو -->
      <input
          v-model="search"
          type="text"
          placeholder="جستجو در عنوان..."
          class="w-full border rounded px-3 py-2 mb-4 text-right"
      />

      <!-- جدول اطلاعات -->
      <table class="w-full border text-right">
        <thead class="bg-gray-100">
        <tr>
          <th class="border p-2">عنوان</th>
          <th class="border p-2">عرض (Lat)</th>
          <th class="border p-2">طول (Lng)</th>
          <th class="border p-2">تصویر</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="p in filteredPoints"
            :key="p.id"
            class="hover:bg-gray-100 cursor-pointer"
            @click="selectFromTable(p)"
        >
          <td class="border p-2">{{ p.title }}</td>
          <td class="border p-2">{{ p.lat }}</td>
          <td class="border p-2">{{ p.lng }}</td>

          <td class="border p-2 text-center">
            <img
                v-if="p.image"
                :src="imageUrl(p.image)"
                class="w-12 h-12 object-cover rounded"
            />
          </td>
        </tr>
        </tbody>
      </table>

      <!-- دکمه بستن -->
      <div class="flex justify-center mt-4">
        <button
            @click="showList = false"
            class="px-4 py-2 bg-red-500 text-white rounded"
        >
          بستن
        </button>
      </div>
    </div>
  </div>

  <!-- ===========================
       📌 Info Box (کلیک روی نقاط)
       =========================== -->
  <div
      v-if="selectedPoint"
      class="fixed bottom-5 right-5 bg-white shadow-xl border rounded-lg p-4 w-80 z-50"
  >
    <h3 class="font-bold text-lg mb-2 text-right">{{ selectedPoint.title }}</h3>
    <p class="text-gray-700 mb-2 text-right">{{ selectedPoint.desc }}</p>

    <p class="text-xs text-gray-500 text-right mb-3">
      lat: {{ selectedPoint.lat }} — lng: {{ selectedPoint.lng }}
    </p>

    <!-- تصویر کوچک -->
    <img
        v-if="selectedPoint.image"
        :src="imageUrl(selectedPoint.image)"
        class="w-full h-40 object-cover rounded cursor-pointer"
        @click="showImage = true"
    />

    <button
        @click="selectedPoint = null"
        class="mt-3 bg-red-500 text-white px-3 py-2 rounded w-full"
    >
      بستن
    </button>
  </div>

  <!-- ===========================
       📸 نمایش تصویر بزرگ
       =========================== -->
  <div
      v-if="showImage"
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      @click="showImage = false"
  >
    <img
        :src="imageUrl(selectedPoint.image)"
        class="max-w-[90%] max-h-[90%] rounded shadow-lg"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";

const props = defineProps({
  viewer: { type: Object, required: true }
});

const showList = ref(false);
const search = ref("");
const points = ref([]);
const cesiumEntities = ref([]);
const pointsVisible = ref(true);

const selectedPoint = ref(null);
const showImage = ref(false);

import { useAuthStore } from '../stores/auth';
const SERVER = import.meta.env.VITE_SERVER;
const authStore = useAuthStore();

onMounted(async () => {
  await reload();
  addPointsToCesium();
});

const reload =async () => {
  const res = await axios.get(SERVER + "/api/forms");
  points.value = res.data;

}

/* ---------------- Cesium ---------------- */

const addPointsToCesium = () => {
  cesiumEntities.value = points.value.map(point => {
    const entity = props.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat),
      billboard: {
        image: "/pin.png",
        scale: 0.12
      },
      properties: point
    });
    return entity;
  });

  // کلیک روی نقاط
  props.viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const picked = props.viewer.scene.pick(movement.position);
    if (picked && picked.id && picked.id.properties) {
      selectedPoint.value = picked.id.properties;
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

// روشن/خاموش کردن لایه
const togglePoints = () => {
  pointsVisible.value = !pointsVisible.value;
  cesiumEntities.value.forEach(e => (e.show = pointsVisible.value));
};

// جستجو
const filteredPoints = computed(() =>
    points.value.filter(p =>
        p.title.toLowerCase().includes(search.value.toLowerCase())
    )
);

// کلیک روی ردیف جدول
const selectFromTable = p => {
  flyToPoint(p);
  selectedPoint.value = p;
  showList.value = false;
};

// پرواز روی نقطه
const flyToPoint = point => {
  props.viewer.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, 2000)
  });
};

// ساخت URL تصویر
const imageUrl = (path) => `${SERVER}/uploads/${path}`;
</script>

<style scoped>
* {
  direction: rtl;
}
</style>
