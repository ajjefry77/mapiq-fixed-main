<template>
  <div class="absolute top-[calc(var(--top)+103px)] left-[12px] z-50 flex items-center ">
    <!-- آیکن کوچک مشکی و مربع -->

<!--    class="w-8 h-8 bg-[var(&#45;&#45;primary-color)] text-white border border-gray-300 rounded px-2 py-1 shadow transition hover:bg-accent-soft items-center"-->
    <button
        @click="expanded = !expanded"
        class= 'w-8 h-8 bg-gray-200 rounded flex items-center justify-center shadow-md' dir="ltr"
        title="رفتن به موقعیت">
      <i class="fas fa-location m-1"></i>
    </button>

    <!-- فیلد باز شونده کنار آیکن -->
    <div
        v-show="expanded"
        class="absolute top-0 left-full mr-2 w-80 flex items-center bg-white border border-gray-300 rounded shadow-md overflow-hidden h-[34px]"
        @click.stop>

      <button
          @click="goToLocation"
          title="رفتن به موقعیت"
          class="bg-[var(--primary-color)] text-white px-3 h-full hover:bg-accent-dim transition flex-shrink-0">
        <i class="fas fa-arrow-left" />
      </button>

      <input v-if="!latlon"
          v-model="zone" type="text"   :placeholder="String(zone)" @keyup.enter="goToLocation"
          class="w-12 h-full text-sm focus:outline-none border-r"/>

      <div class="flex-1 grid grid-cols-2">
        <input
            v-model="lng_y" type="text"   :placeholder="latlon ? 'Longitude' : 'Y (Northing)'" @keyup.enter="goToLocation"
            class="px-2 h-full text-sm focus:outline-none border-r"/>

        <input
            v-model="lat_x" type="text"   :placeholder="latlon ? 'Latitude' : 'X (Easting)'" @keyup.enter="goToLocation"
            class="px-2 h-full text-sm focus:outline-none border-r"/>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import proj4 from "proj4";

const props = defineProps({
  viewer: {
    type: Object,
    required: true,
  },
  latlon : Boolean
});

const expanded = ref(false);
const coords = ref("");
const lng_y = ref("");
const lat_x = ref("");
const zone = ref(39);


function goToLocation() {
  if (!props.viewer || !lat_x.value || !lng_y.value) return;

  let lat, lng;

  if (props.latlon === true) {
    // حالت GCS → از Lat/Lng مستقیم استفاده کن
    lat = Number(lat_x.value);
    lng = Number(lng_y.value);
  } else {
    // حالت UTM → تبدیل UTM به Lat/Lng
    const result = utmToLatLng({
      x: Number(lat_x.value),
      y: Number(lng_y.value),
      zone: zone.value,  // اگر zone داری
      northern: true        // اگر نیمکره شمالی هستی
    });
    lat = result.lat;
    lng = result.lng;
  }

  if (!isFinite(lat) || !isFinite(lng)) return;

  const destination = Cesium.Cartesian3.fromDegrees(lng, lat, 1500);

  props.viewer.camera.flyTo({
    destination,
    duration: 2,
  });

  coords.value = "";
  expanded.value = false;
}

function utmToLatLng({ x, y, zone, northern = true }) {
  const hemisphere = northern ? "" : "+south";
  const [lng, lat] = proj4(
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
    "EPSG:4326",
    [Number(x), Number(y)],
  );
  return { lat, lng };
}
</script>
