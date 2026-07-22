<template>
  <div class="absolute top-[calc(var(--top)+103px)] left-[12px] z-50 flex items-center ">
    <button
        @click="expanded = !expanded"
        class= 'w-8 h-8 bg-gray-200 rounded flex items-center justify-center shadow-md' dir="ltr"
        title="رفتن به موقعیت">
      <i class="fas fa-location m-1"></i>
    </button>

    <div
        v-show="expanded"
        class="absolute top-0 left-full mr-2 w-72 flex items-center bg-white border border-gray-300 rounded shadow-md overflow-hidden h-[34px]"
        @click.stop>

      <button
          @click="goToLocation"
          class="bg-[var(--primary-color)] text-white px-3 h-full hover:bg-blue-700 transition flex-shrink-0">
        <i class="fas fa-arrow-right" />
      </button>

      <input v-if="!latlon"
          v-model="zone" type="text"   :placeholder="zone" @keyup.enter="goToLocation"
          class="w-6 h-full text-sm focus:outline-none border-r"/>

      <div class="flex-1 grid grid-cols-2">
        <input
            v-model="lng_y" type="text"   :placeholder="latlon ? 'Longitude' : 'Y'" @keyup.enter="goToLocation"
            class="px-2 h-full text-sm focus:outline-none border-r"/>

        <input
            v-model="lat_x" type="text"   :placeholder="latlon ? 'Latitude' : 'X'" @keyup.enter="goToLocation"
            class="px-2 h-full text-sm focus:outline-none border-r"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  map: { type: Object, required: true },
  latlon : Boolean
});

const expanded = ref(false);
const coords = ref("");
const lng_y = ref("");
const lat_x = ref("");
const zone = ref(40);

function goToLocation() {
  if (!props.map || !lat_x.value || !lng_y.value) return;

  let lat, lng;

  if (props.latlon.value === true) {
    lat = Number(lat_x.value);
    lng = Number(lng_y.value);
  } else {
    const result = utmToLatLng({
      x: Number(lat_x.value),
      y: Number(lng_y.value),
      zone: zone.value,
      northern: true
    });
    lat = result.lat;
    lng = result.lng;
  }

  props.map.flyTo({
    center: [lng, lat],
    zoom: 14,
    essential: true
  });

  coords.value = "";
  expanded.value = false;
}

function utmToLatLng({ x, y, zone, northern = true }) {
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  let e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  let xAdj = x - 500000.0;
  let yAdj = northern ? y : y - 10000000.0;
  let M = yAdj / k0;
  let mu = M / (a * (1 - eccSquared / 4 - (3 * eccSquared * eccSquared) / 64 - (5 * eccSquared * eccSquared * eccSquared) / 256));
  let phi1Rad = mu + (3 * e1) / 2 - (27 * e1 ** 3) / 32 * Math.sin(2 * mu) + (21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32 * Math.sin(4 * mu);
  let N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) ** 2);
  let T1 = Math.tan(phi1Rad) ** 2;
  let C1 = (eccSquared / (1 - eccSquared)) * Math.cos(phi1Rad) ** 2;
  let R1 = (a * (1 - eccSquared)) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) ** 2, 1.5);
  let D = xAdj / (N1 * k0);
  let lat = phi1Rad - (N1 * Math.tan(phi1Rad)) / R1 * ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccSquared) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * eccSquared - 3 * C1 ** 2) * D ** 6) / 720);
  let lng = ((D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * eccSquared + 24 * T1 ** 2) * D ** 5) / 120) / Math.cos(phi1Rad)) + ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  return { lat: lat * (180 / Math.PI), lng: lng * (180 / Math.PI) };
}
</script>
