<template>
  <div class="absolute top-[10px] right-[296px] z-50 flex items-center">
    <!-- آیکن کوچک مشکی و مربع -->
    <button
        @click="expanded = !expanded"
        class="bg-[var(--primary-color)] text-white border border-gray-300 rounded-lg px-2 py-1 shadow transition hover:bg-blue-400"
        title="جستجو بر اساس کد نوسازی">
      <i class="fas fa-qrcode m-1"></i>
    </button>

    <!-- فیلد باز شونده کنار آیکن -->
    <div
        v-show="expanded"
        class="absolute top-0 right-full mr-2 w-[287px] flex items-center bg-white border border-gray-300 rounded shadow-md overflow-hidden h-[34px]"
        @click.stop>

<!--      <MaskedInput v-model="searchText"/>-->
      <input v-model="searchText" placeholder="کد نوسازی" class="border p-2 rounded w-full text-center"/>
      <button
          @click="searchFeatures"
          class="bg-[var(--primary-color)] text-white px-1 h-full hover:bg-blue-700 transition rounded-sm">
        <i class="fas fa-search m-1"></i>
      </button>
    </div>
  </div>
<!--  <span class="absolute top-14 left-10">{{searchText}}</span>-->

</template>

<script setup>
import { ref } from "vue";
import MaskedInput from './MaskedInput.vue'
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
const username = ref('admin')
const password = ref('geoserver')

async function searchFeatures() {
  if (!searchText.value.trim()) return alert("عبارتی وارد کنید.");

  const viewer = props.viewer;
  if (!viewer) return console.error("Viewer پاس داده نشده!");
  //searchText.value = '4-3-2-4';
  const rawKeyword = searchText.value.replace(/'/g, "''"); // escape single quotes
  const cql = `strToLowerCase(code) LIKE '%${rawKeyword}%'`;
  console.log('nosazi : '+ cql);
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
      alert("هیچ فیچری یافت نشد.");
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
    console.log(err);
    alert("خطایی رخ داد. جزئیات در کنسول موجود است.");
  }
}


</script>
