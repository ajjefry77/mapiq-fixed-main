<template>
  <div class="absolute top-[10px] right-[296px] z-50 flex items-center">
    <!-- آیکن کوچک مشکی و مربع -->
    <button
        @click="expanded = !expanded"
        class="icon-btn"
        style="border-radius:12px"
        title="جستجو بر اساس کد نوسازی" aria-label="جستجو بر اساس کد نوسازی" :aria-expanded="expanded">
      <i class="fas fa-qrcode m-1"></i>
    </button>

    <!-- فیلد باز شونده کنار آیکن -->
    <div
        v-show="expanded"
        class="glass-panel absolute top-0 right-full ms-2 w-[287px] max-w-[calc(100vw-16px)] flex items-center overflow-hidden min-h-[44px]"
        @click.stop>

<!--      <MaskedInput v-model="searchText"/>-->
      <input v-model="searchText" placeholder="کد نوسازی" @keyup.enter="searchFeatures" class="flex-1 bg-transparent px-3 text-center text-sm outline-none" style="color:var(--text)"/>
      <button
          @click="searchFeatures"
          class="btn btn-primary btn-sm self-stretch" style="border-radius:0" aria-label="جستجو">
        <i class="fas fa-search m-1"></i>
      </button>
    </div>
  </div>
<!--  <span class="absolute top-14 left-10">{{searchText}}</span>-->

</template>

<script setup>
import { ref } from "vue";
import MaskedInput from './MaskedInput.vue'
import { logger } from "@/logger"
import { useNotify } from "@/composables/useNotify";
const { warning: notifyWarning, error: notifyError } = useNotify();
const GEOSERVER = import.meta.env.VITE_GEOSERVER //?? 'http://localhost:8080';

const props = defineProps({
  viewer: {
    type: Object,
    required: true,
  },
});

const searchText=ref("");
const expanded = ref(false);
const coords = ref("");
const workspace = ref('Amlak')
const layer = ref('عرصه')

async function searchFeatures() {
  if (!searchText.value.trim()) { notifyWarning("عبارتی وارد کنید."); return; }

  const viewer = props.viewer;
  if (!viewer) { logger.error("map.viewer.missing", { component: "SearchCode" }); return; }
  //searchText.value = '4-3-2-4';
  const rawKeyword = searchText.value.replace(/'/g, "''"); // escape single quotes
  const cql = `strToLowerCase(code) LIKE '%${rawKeyword}%'`;
  logger.info("search.started", { cql })
  // const url =
  //     `${GEOSERVER}/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature` +
  //     `&typeName=${workspace.value}:${layer.value}` +
  //     `&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=${encodeURIComponent(cql)}`;


  const url = `${GEOSERVER}/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature` +
  `&typeName=${workspace.value}:${layer.value}&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=${encodeURIComponent(cql)}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error("خطا در دریافت داده‌ها")

    const geojson = await res.json();
    viewer.dataSources.removeAll();

    if (!geojson.features.length) {
      notifyWarning("هیچ فیچری یافت نشد.");
      return;
    }

    // بارگذاری داده در viewer موجود
    const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
      clampToGround: true,
    });
    viewer.dataSources.add(dataSource);

    // استایل‌ها
    const entities = dataSource.entities.values;
    for (const entity of entities) {
      if (entity.point) {
        entity.point = new Cesium.PointGraphics({
          color: Cesium.Color.RED,
          pixelSize: 10,
        });
      }
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.5);
      }
    }
    const camera = viewer.camera;
    viewer.flyTo(dataSource, {
      offset: {
        heading: camera.heading,
        pitch: camera.pitch,
        range: 1000,
        roll: camera.roll
      }
    });

  } catch (err) {
    logger.warn("search.failed", {}, err)
    notifyError("خطا در جستجو. اتصال را بررسی و دوباره تلاش کنید.");
  }
}


</script>
