<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg shadow-xl w-11/12 md:w-2/4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">لیست ذخیره شده ها</h2>
        <button @click="close" class="text-gray-600 hover:text-red-500 text-xl font-bold">×</button>
      </div>

      <!-- Scrollable List (table-like rows: folder | title | date | description) -->
      <div class="overflow-y-auto p-4 space-y-2 text-sm">
        <div class="overflow-y-auto p-4">
          <table class="w-full text-right border-collapse">
            <thead class="bg-gray-100">
            <tr>
              <th class="p-2 border">عنوان</th>
              <th class="p-2 border">تاریخ</th>
              <th class="p-2 border">توضیحات</th>
              <th class="p-2 border text-center">عملیات</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(item, index) in items" :key="item.id || item._id || index" class="hover:bg-gray-50">
              <td class="p-2 border">{{ item.name }}</td>
              <td class="p-2 border">{{ item.updatedAt }}</td>
              <td class="p-2 border">{{ item.description }}</td>
              <td class="p-2 border text-center">
                <i class="fa-solid fa-folder-open text-yellow-500 text-xl" @click="loadItem(item)"></i>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <transition name="fade">
    <div v-if="selectedPin" class="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div class="bg-white rounded-2xl p-6 w-96 shadow-xl relative">
        <button @click="selectedPin = null" class="absolute top-4 left-4 text-gray-500 hover:text-black">✕</button>

        <h2 class="text-xl font-semibold mb-2">{{ selectedPin.name }}</h2>
        <p v-if="selectedPin.description" class="text-gray-700 text-sm mb-3 border border-gray-200 p-2">{{ selectedPin.description }}</p>
        <div v-if="selectedPin.file" class="text-sm text-white bg-green-600 p-1 ">

          <div v-if="isImage(selectedPin.file)" class="border rounded-lg overflow-hidden">
            <img  :src="SERVER + '/uploads/pins/' + selectedPin.file"  class="w-full bg-white h-84 object-cover cursor-pointer"
              @click="openNewWindow( SERVER + '/uploads/pins/' + selectedPin.file)" >
          </div>
          
          <div v-else>  
            <button @click="openNewWindow( SERVER + '/uploads/pins/' + selectedPin.file)">📎 مشاهده فایل پیوست</button>
          </div>

        </div>
      </div>
      <!-- <UsersDepSelect  :isOpen="DepsModal" @update:selected="selectedItem = $event" @close="DepsModal = false" /> -->
    </div>
  </transition>

</template>

<script setup>
import { ref, onMounted, onActivated } from "vue";
import axios from "axios";
import { useAuthStore } from '../stores/auth';
const authStore = useAuthStore();

const SERVER = import.meta.env.VITE_SERVER;

const props = defineProps({
  visible: { type: Boolean, default: false },
  pins: { type: Object, required: true },
  openId :  { type: Object, required: true },
  viewer: { type: Object, required: true },

});

const emit = defineEmits([  "update:visible", "update:pins"]);
const items = ref([]);
const reopen = ref(false);
const selectedPin = ref(null);


onMounted(fetchPins);
onActivated(fetchPins);

async function fetchPins() {
  const userId = authStore.user?.id;
  if (!userId) return;

  try {
    const res = await axios.get(`${SERVER}/api/pins/${userId}`);
    items.value = res.data;
  } catch (e) {
    console.error("Error fetching list:", e);
  }
}

const close = () => {
  emit("update:visible", false);
};

function isImage(file) {
  let fileName = file._value;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg','jpeg','png','gif','webp','svg','bmp'].c(ext);
};

function openNewWindow(val) {
  window.open(
    val,  
    "newWindow",           
    "width=800,height=600,top=100,left=100" 
  );
}

const loadItem = (item) => {
  props.openId.value = item.id;
  emit('update:pins', item.shape);
  drawShapes(item.shape)
  emit("update:visible", false);
};

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d)) return val; // اگر فرمت غیرقابل‌فهم بود، خود مقدار را نمایش بده
  return d.toLocaleString(); // یا هر فرمت دلخواهی
}

async function drawShapes(shapesArray) {
  const viewer = props.viewer;
  // const drawDataSource= new Cesium.CustomDataSource("pins");
  // viewer.dataSources.add(drawDataSource);

  const drawDataSource = viewer.dataSources.getByName("pins")[0];
  
  viewer.scene.pickTranslucentDepth = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  const handler = new Cesium.ScreenSpaceEventHandler(props.viewer.scene.canvas);

  for (const item of shapesArray) {
    const shape = item.shape;

    // ------------------ File ------------------
    if (item.id == 'file') {
      // DataSource = await Cesium.GeoJsonDataSource.load(geojson)
      // await viewer.dataSources.add(DataSource)
      const geojsonUrl = SERVER + '/uploads/pins/' + item.file;
      const dataSource = await Cesium.GeoJsonDataSource.load(geojsonUrl);
      props.viewer.dataSources.add(dataSource);

      // await props.viewer.flyTo(dataSource).then(() => {
      //     let savedCameraView = {
      //       position: props.viewer.camera.position.clone(),
      //       heading: props.viewer.camera.heading,
      //       pitch: props.viewer.camera.pitch,
      //       roll: props.viewer.camera.roll
      //     };
      // });


    } else {

      switch (shape.type) {

        // ------------------ Point ------------------
        case "point": {
          const center = Cesium.Cartesian3.fromDegrees(
              shape.lon,
              shape.lat,
          );

        const pointEntity = drawDataSource.entities.add({
            position: center,
            billboard: {
              image: "pin.png",
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              width: 32,
              height: 32
            },
            name: "Location Marker",
            //properties: { description: pin.description, file: pin.file },
            properties : item,
            id : item.id
          });
          break;
        }

        // ------------------ Polyline ------------------
        case "polyline": {
          const positions = shape.positions.map(p =>
              Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height)
          );

          drawDataSource.entities.add({
            polyline: {
              positions: positions,
              width: shape.width || 3,
              material: Cesium.Color.fromCssColorString(shape.color || "#ff0000"),
            },
            properties : item,
            id : item.id
          });
          break;
        }

        // ------------------ Circle ------------------
        case "circle": {
          const center = Cesium.Cartesian3.fromDegrees(
              shape.center.lon,
              shape.center.lat,
          );


            drawDataSource.entities.add({
              position: center,
              ellipse: {
                semiMinorAxis: shape.radius,
                semiMajorAxis: shape.radius,
                material: Cesium.Color.fromCssColorString(shape.color).withAlpha(0.5),
              },
              properties : item,
              id : item.id
            });

          break;
        }

        // ------------------ Polygon ------------------
        case "polygon": {
          const coords = shape.coordinates[0].flat(); // [lon,lat,height,...]

          const positions = Cesium.Cartesian3.fromDegreesArrayHeights(coords);

          drawDataSource.entities.add({
            polygon: {
              hierarchy: positions,
              material: Cesium.Color.fromCssColorString(shape.color || "#ff0000").withAlpha(0.4),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(shape.color || "#ff0000"),
            },
            properties : item,
            id : item.id
          });
          break;
        }
      }

    }

  }

  props.viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position);
    
    //console.log(".");
    if (Cesium.defined(picked) && picked.id) {
      const entity = picked.id;
      //viewer.selectedEntity = entity;
      if (entity.properties) {
        //console.log("clicked entity:", entity.properties.getValue());
        let item = entity.properties;
        selectedPin.value = {
          name: item.name,
          description: item.descr,
          file: item.filename,
        };

      }
    }

  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  
}

</script>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* small responsive tweak: در موبایل 2 ستون نشون میده (در صورت خواست) */
@media (max-width: 640px) {
  .grid-cols-4 {
    grid-template-columns: 40px 1fr 120px 1fr !important;
  }
}
</style>
