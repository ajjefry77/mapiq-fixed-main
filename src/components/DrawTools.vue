<template>
  <div class="absolute top-[calc(var(--top)+137px)] left-1 z-50">
    <!-- دکمه اصلی -->
<!--    <button  @click="expanded = !expanded" title="Drawing Tools"-->
<!--        class="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center shadow-md">-->
<!--      <i class="fas fa-pencil-alt"></i>-->
<!--    </button>-->

    <!-- Drawing menu -->
    <div  @click.stop
         class="flex flex-col  rounded shadow-md p-2 gap-2">

      <button
          @click="toggleMeasure"  title="اندازه گیری" style="margin: 0"
          class="w-8 h-8 rounded flex items-center justify-center shadow-md"
          :class ="drawMode === 'measure' ? 'text-white bg-blue-500' : 'text-black bg-gray-200'">
        <i class="fas fa-ruler  m-1"></i>
      </button>

      <!-- pin -->
      <button @click="togglePointPick" :class= "['w-8 h-8 rounded flex items-center justify-center shadow-md' ,
              pickForForm ? 'text-white bg-blue-500' : 'text-black bg-gray-200']" title="نقطه (انتخاب برای فرم)">

        <i class="fas fa-location-pin"></i>
      </button>

      <button @click="setDrawMode('multi_point')" :class= "['w-8 h-8 rounded flex items-center justify-center shadow-md' ,
              drawMode === 'multi_point' ? 'text-white bg-blue-500' : 'text-black bg-gray-200']" title="چند نقطه">

        <i class="fas fa-braille "></i>
      </button>

      <!-- line -->
      <button @click="setDrawMode('polyline')" :class="['w-8 h-8 rounded flex items-center justify-center shadow-md',
               drawMode === 'polyline' ? 'text-white bg-blue-500' : 'text-black bg-gray-200']" title="خط">
        <svg width="35" height="35" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <line x1="25" y1="75" x2="75" y2="25" stroke-width="6" :class="drawMode === 'polyline' ? 'stroke-white' : 'stroke-black'"/>
          <circle cx="25" cy="75" r="6" :class="drawMode === 'polyline' ? 'fill-white' : 'fill-black'" />
          <circle cx="75" cy="25" r="6" :class="drawMode === 'polyline' ? 'fill-white' : 'fill-black'" />
        </svg>
      </button>

      <!-- polygon -->
      <button @click="setDrawMode('polygon')" :class="['w-8 h-8 rounded flex items-center justify-center shadow-md',
              drawMode === 'polygon' ? 'text-white bg-blue-500' : 'text-black bg-gray-200']" title="پلیگون">
        <i class="fas fa-draw-polygon"></i>
      </button>

      <!-- circle -->
      <button @click="setDrawMode('circle')" :class="['w-8 h-8 rounded flex items-center justify-center shadow-md',
              drawMode === 'circle' ? 'text-white bg-blue-500' : 'text-black bg-gray-200']" title="دایره">
        <i class="fa fa-circle"></i>
      </button>

      <!-- color -->
      <label class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer" title="انتخاب رنگ">
        <span class="w-5 h-5 " :style="{ backgroundColor: color }"></span>
        <input type="color" v-model="color" class="hidden" />
      </label>

      <!-- erase
      <button @click="clearSelectedOrAll" class="w-8 h-8 bg-gray-200 rounded flex items-center justify-center shadow-md" title="پاک کن">
        <i class="fas fa-trash text-red-500"></i>
      </button>-->

      <!-- save
      <button @click="openSaveDialog" class="w-8 h-8 bg-gray-200 text-green-600 rounded flex items-center justify-center shadow-md" title="ذخیره">
        <i class="fas fa-save"></i>
      </button>-->

      <!-- close
      <button @click="expanded = false" class="text-gray-500 hover:text-black text-lg" title="بستن">
        <i class="fas fa-times"></i>
      </button> -->
    </div>
  </div>

  <!-- مودال افزودن پین -->
  <transition name="fade">
    <div v-if="showForm"
         class="absolute inset-0 bg-black/40 flex items-end justify-end px-14 py-32 z-50"
         @contextmenu.prevent @click.self="cancelForm">
      <div class="bg-white rounded-2xl p-6 w-96 shadow-xl relative flex flex-col" style="max-height:80vh">
        <button @click="cancelForm" class="absolute top-4 left-4 text-gray-500 hover:text-black">✕</button>
        <h2 class="text-md font-semibold mb-3">افزودن ترسیم جدید</h2>

        <!-- تب‌ها -->
        <div class="flex border-b mb-3">
          <button type="button" @click="activeFormTab = 'info'"
                  :class="['px-3 py-1 text-sm', activeFormTab === 'info' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500']">
            توضیحات
          </button>
          <button type="button" @click="activeFormTab = 'style'"
                  :class="['px-3 py-1 text-sm', activeFormTab === 'style' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500']">
            استایل
          </button>
          <button type="button" @click="activeFormTab = 'image'"
                  :class="['px-3 py-1 text-sm', activeFormTab === 'image' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500']">
            تصویر
          </button>
          <button type="button" @click="activeFormTab = 'measure'"
                  :class="['px-3 py-1 text-sm', activeFormTab === 'measure' ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500']">
            اندازه‌ها
          </button>
        </div>

        <form @submit.prevent="savePin" class="overflow-y-auto" style="flex:1">

          <!-- تب توضیحات -->
          <div v-show="activeFormTab === 'info'">
            <label class="block mb-2 text-sm font-medium">نام</label>
            <input v-model="formData.name" type="text" class="w-full border rounded-lg p-2 mb-3" required />

            <label class="block mb-2 text-sm font-medium">توضیحات</label>
            <textarea v-model="formData.description" class="w-full border rounded-lg p-2 mb-3" rows="4"></textarea>
          </div>

          <!-- تب استایل -->
          <div v-show="activeFormTab === 'style'" class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm">رنگ حاشیه / خط</span>
              <input type="color" v-model="styleData.borderColor" @change="applyStyleToShape" class="w-10 h-8 cursor-pointer" />
            </div>

            <div v-if="drawMode === 'polygon' || drawMode === 'circle'" class="flex items-center justify-between">
              <span class="text-sm">رنگ داخل (پرشدگی)</span>
              <input type="color" v-model="styleData.fillColor" @change="applyStyleToShape" class="w-10 h-8 cursor-pointer" />
            </div>

            <div v-if="drawMode === 'polygon' || drawMode === 'circle'">
              <label class="text-sm">شفافیت: {{ styleData.transparency }}%</label>
              <input type="range" min="0" max="100" v-model="styleData.transparency" @change="applyStyleToShape" class="w-full" />
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm">ضخامت خط</span>
              <input type="number" min="1" v-model="styleData.width" @change="applyStyleToShape" class="w-20 border rounded p-1" />
            </div>
          </div>

          <!-- تب تصویر ضمیمه -->
          <div v-show="activeFormTab === 'image'">
            <label class="block mb-2 text-sm font-medium">فایل ضمیمه (تصویر زمینه)</label>
            <input type="file" accept="image/*" @change="onFileChange" class="w-full border rounded-lg p-2 mb-3" />
            <img v-if="imagePreview" :src="imagePreview" class="w-full max-h-48 object-contain rounded-lg border" />
          </div>

          <!-- تب اندازه‌ها -->
          <div v-show="activeFormTab === 'measure'" class="text-sm">
            <ul class="space-y-1 mb-3">
              <li v-if="formMeasure.length"><span class="font-semibold">طول: </span>{{ formMeasure.length }}</li>
              <li v-if="formMeasure.perimeter"><span class="font-semibold">محیط: </span>{{ formMeasure.perimeter }}</li>
              <li v-if="formMeasure.area"><span class="font-semibold">مساحت: </span>{{ formMeasure.area }}</li>
              <li v-if="formMeasure.radius"><span class="font-semibold">شعاع: </span>{{ formMeasure.radius }}</li>
              <li><span class="font-semibold">تعداد نقاط: </span>{{ formPoints.length }}</li>
            </ul>

            <div class="max-h-48 overflow-y-auto border rounded-lg">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-gray-100">
                <tr>
                  <th class="p-1 border">ردیف</th>
                  <th class="p-1 border">طول جغرافیایی</th>
                  <th class="p-1 border">عرض جغرافیایی</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="p in formPoints" :key="p.row">
                  <td class="p-1 border text-center">{{ p.row }}</td>
                  <td class="p-1 border font-mono">{{ p.lon }}</td>
                  <td class="p-1 border font-mono">{{ p.lat }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

        </form>

        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
          <button type="button" @click="cancelForm" class="px-4 py-2 bg-gray-300 rounded-lg">لغو</button>
          <button type="button" @click="savePin" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ذخیره</button>
        </div>
      </div>
    </div>

  </transition>


  <MultiPointsList  v-if="drawMode === 'multi_point'" :pointList="pointList"/>
  <!--<SaveDialog v-model="showDialog" @confirm="saveDrawing" />-->
  <Loading :active="loading" />

</template>

<script setup>
import { ref, toRaw, onMounted, onUnmounted, inject } from 'vue';
import axios from "axios";
import proj4 from "proj4";
import Loading from '../components/Loading.vue'
import MultiPointsList from '../components/MultiPointsList.vue'
import SaveDialog from '../components/SaveDialog.vue'
import {useAuthStore} from '../stores/auth';
import { useToast } from "vue-toast-notification";
const SERVER = import.meta.env.VITE_SERVER //?? 'http://localhost:3001';
const authStore = useAuthStore();
const $toast = useToast();
const SelectGroup = inject('SelectGroup', null)

const props = defineProps({
  viewer: { type: Object, required: true },
  pins : { type: Object, required: true }
});

const loading = ref(false);
const expanded = ref(false);
const drawMode = ref('');
const color = ref('#ff0000');
const pickForForm = ref(false);
const drawings = ref([]);
const selectedEntity = ref(null);

const handler2 = ref(null);
let polylineEntity = null;
const measureActive = ref(false);
const points = [];
const entities = [];
let vertexPoints = [];
const positions=[];
const pointList = ref([]);


let handler = null;
const showDialog = ref(false)
const formData = ref({ name: "", description: "", file: null });
const showForm = ref(false)
const selectedPin = ref(null);
const newPinCoords = ref(null);
const shape = ref(null);
const attch_file = ref(null);
let shape_id='';
let radius=0;

// --- state جدید برای پنجره‌ی چهار تبی ترسیم ---
const activeFormTab = ref('info'); // info | style | image | measure
const styleData = ref({ borderColor: '#ff0000', fillColor: '#ff0000', transparency: 50, width: 3 });
const formPoints = ref([]); // نقاط شکل با مختصات، برای تب اندازه‌ها
const formMeasure = ref({ length: '', perimeter: '', area: '', radius: '' });
const imagePreview = ref(null);
let currentShapeEntities = []; // همه‌ی entity های شکل درحال رسم، برای حذف مطمئن هنگام لغو

let drawDataSource= null;
let ds= null;
const emit = defineEmits(["disableFeatureInfo", "pickPoint"]);

onMounted ( () => {
  drawDataSource= new Cesium.CustomDataSource("pins");
  props.viewer.dataSources.add(drawDataSource);
});

onUnmounted(() => {
  window.removeEventListener('keydown', keydownHandler);
});
function togglePointPick() {
  emit("disableFeatureInfo");
  if (pickForForm.value) {
    cancelPointPick();
    return;
  }
  // لغو هر حالت ترسیم قبلی
  if (handler) { handler.destroy(); handler = null; }
  drawMode.value = '';
  pickForForm.value = true;
  startPointPick();
}

function startPointPick() {
  if (!props.viewer) return;
  props.viewer.scene.canvas.style.cursor = 'crosshair';
  if (handler) handler.destroy();
  handler = new Cesium.ScreenSpaceEventHandler(props.viewer.scene.canvas);

  handler.setInputAction((click) => {
    const position = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid);
    if (!position) return;

    const carto = Cesium.Cartographic.fromCartesian(position);
    const lat = +Cesium.Math.toDegrees(carto.latitude).toFixed(6);
    const lng = +Cesium.Math.toDegrees(carto.longitude).toFixed(6);

    if (handler) { handler.destroy(); handler = null; }
    props.viewer.scene.canvas.style.cursor = 'default';
    pickForForm.value = false;
    drawMode.value = '';

    emit("pickPoint", { lat, lng });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function cancelPointPick() {
  if (handler) { handler.destroy(); handler = null; }
  if (props.viewer) props.viewer.scene.canvas.style.cursor = 'default';
  pickForForm.value = false;
}

function setDrawMode(mode) {
  emit("disableFeatureInfo");
  pickForForm.value = false;
  if (drawMode.value!=='') {
    finishDrawing("multi_point", positions)
    showForm.value = true;
    return;
  }
  measureActive.value=false;
  stopMeasure();
  drawMode.value = mode;
  startDrawing();
}

function startDrawing() {
  if (!props.viewer) return;

  styleData.value = { borderColor: color.value, fillColor: color.value, transparency: 50, width: 3 };
  currentShapeEntities = [];

  //const drawDataSource = store.value;

  if (handler) handler.destroy();
  handler = new Cesium.ScreenSpaceEventHandler(props.viewer.scene.canvas);

  if (drawMode.value === 'multi_point') {
    props.viewer.scene.canvas.style.cursor = 'crosshair';
    pointList.value = [];

    shape_id = crypto.randomUUID()
    ds= new Cesium.CustomDataSource(shape_id);
    props.viewer.dataSources.add(ds);

    handler.setInputAction((click) => {
      // گرفتن موقعیت روی الیپسویید زمین
      const position = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid );

      if (position) {

        const pointEntity = ds.entities.add({
          name: "mp",
          position: position,
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString(color.value || '#ff0000'),
            outlineColor: Cesium.Color.fromCssColorString('#ffffff'),
            outlineWidth: shape.outlineWidth || 1,
            show: true
          }
        });
        position.color = color.value?? '#ff0000';
        positions.push(position)

        const carto = Cesium.Cartographic.fromCartesian(position);

        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);

        // اگر proj4 نصب داری
        const zone = Math.floor((lon + 180) / 6) + 1;

        const [x, y] = proj4(
            "EPSG:4326",
            `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
            [lon, lat]
        );

        pointList.value.push({
          id: crypto.randomUUID(),
          row: pointList.value.length + 1,
          x: Number(x).toFixed(3),
          y: Number(y).toFixed(3)
        });

      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      if (positions.length < 1) return;

      handler.destroy();
      finishDrawing("multi_point", positions)
      showForm.value = true;

    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);


  }

  if (drawMode.value === 'point') {
    props.viewer.scene.canvas.style.cursor = 'crosshair';

    handler.setInputAction((click) => {
      // گرفتن موقعیت روی الیپسویید زمین
      const position = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid );

      if (position) {
        // اضافه کردن نقطه با آیکون
        const pointEntity = drawDataSource.entities.add({
          position: position,
          billboard: {
            image: "pin.png",
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            width: 32,
            height: 32
          },
          name: "Location Marker",
          //properties: { description: pin.description, file: pin.file },
        });

        drawings.value.push(pointEntity);
        currentShapeEntities.push(pointEntity);
        showForm.value = true;
        shape_id = pointEntity.id;
        finishDrawing("point", position)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  // --- خط ---
  else if (drawMode.value === 'polyline') {
    let positions = [];
    const polyline = drawDataSource.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => positions, false),
        width: 3,
        material: Cesium.Color.fromCssColorString(color.value),
      },

    });
    drawings.value.push(polyline);
    currentShapeEntities.push(polyline);
    shape_id = polyline.id;

    handler.setInputAction((click) => {
      const pos = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid);
      if (pos) positions.push(pos);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      const pos = props.viewer.camera.pickEllipsoid(move.endPosition, props.viewer.scene.globe.ellipsoid);
      if (pos && positions.length > 0) {
        if (positions.length > 1) positions.pop();
        positions.push(pos);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(() => {
      if (positions.length === 0) return;

      if (positions.length > 1) {
        positions.splice(positions.length - 2, 1);
        if (positions.length < 2) {
          handler.destroy();
          //drawMode.value='';
        }
      } else {
        positions.pop();
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    const keydownHandler = (event) => {
      if (event.key === 'Delete') {
        if (positions.length > 1) {
          positions.splice(positions.length - 2, 1);
          if (positions.length < 2) {
            handler.destroy();
          }
        } else {
          positions.pop();
        }
      }
    }; window.addEventListener('keydown', keydownHandler);

    handler.setInputAction(() => {
      handler.destroy(); // دابل کلیک = پایان
      showForm.value = true;
      finishDrawing("polyline", positions)
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  // --- دایره ---
  else if (drawMode.value === 'circle') {
    let center = null;
    //let radius = 0;
    let circleEntity = null;

    handler.setInputAction((click) => {
      if (!center) {
        center = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid);
        if (center) {
          circleEntity = drawDataSource.entities.add({
            position: center,
            ellipse: {
              semiMinorAxis: new Cesium.CallbackProperty(() => radius, false),
              semiMajorAxis: new Cesium.CallbackProperty(() => radius, false),
              material: Cesium.Color.fromCssColorString(color.value).withAlpha(0.5)
            }
          });
          drawings.value.push(circleEntity);
          currentShapeEntities.push(circleEntity);
          shape_id = circleEntity.id;
        }
      } else {
        showForm.value = true;
        finishDrawing("circle", center)
        handler.destroy(); // کلیک دوم = پایان
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      if (!center) return;
      const pos = props.viewer.camera.pickEllipsoid(move.endPosition, props.viewer.scene.globe.ellipsoid);
      if (pos) {
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const dz = pos.z - center.z;
        radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  // --- پلیگون ---
  else if (drawMode.value === 'polygon') {
    let positions = [];
    const polygon = drawDataSource.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(positions), false),
        material: Cesium.Color.fromCssColorString(color.value).withAlpha(0.5),
        outline: true, // فعال کردن نمایش حاشیه الزامی است
        outlineColor:  Cesium.Color.fromCssColorString(color.value || '#0000ff'),
        outlineWidth: 3,
        height : 0
      }
    });
    drawings.value.push(polygon);
    currentShapeEntities.push(polygon);
    shape_id = polygon.id;

    handler.setInputAction((click) => {
      const pos = props.viewer.camera.pickEllipsoid(click.position, props.viewer.scene.globe.ellipsoid);
      if (pos) positions.push(pos);
      const pointEntity = drawDataSource.entities.add({
        position: pos,
        point: {
          pixelSize: 6,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.black,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      vertexPoints.push(pointEntity);

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      const pos = props.viewer.camera.pickEllipsoid(move.endPosition, props.viewer.scene.globe.ellipsoid);
      if (pos && positions.length > 0) {
        if (positions.length > 1) positions.pop();
        positions.push(pos);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(() => {
      if (positions.length === 0) return;

      if (positions.length > 1) {
        positions.pop();
        //positions.splice(positions.length - 2, 1);

        const vertex = vertexPoints.pop();
        if (vertex) {
          drawDataSource.entities.remove(vertex);
        }
        if (positions.length < 3) {
          handler.destroy();
          //drawMode.value='';
          vertexPoints.forEach(p => {
            drawDataSource.entities.remove(p);
          });
          vertexPoints = [];

        }
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    const keydownHandler = (event) => {
      if (event.key === 'Delete') {
        if (positions.length === 0) return;

        if (positions.length > 1) {
          positions.pop();
          //positions.splice(positions.length - 2, 1);

          const vertex = vertexPoints.pop();
          if (vertex) {
            drawDataSource.entities.remove(vertex);
          }
          if (positions.length < 3) {
            handler.destroy();
            //drawMode.value='';
            vertexPoints.forEach(p => {
              drawDataSource.entities.remove(p);
            });
            vertexPoints = [];

          }
        }
      }
    }; window.addEventListener('keydown', keydownHandler);


    handler.setInputAction(() => {
      handler.destroy(); // دابل کلیک = پایان
      vertexPoints.forEach(p => {
        drawDataSource.entities.remove(p);
      });

      vertexPoints = [];

      showForm.value = true;
      finishDrawing("polygon", positions)
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  // انتخاب entity
  props.viewer.selectedEntityChanged.addEventListener((entity) => {
    selectedEntity.value = entity;
  });
}

function formatLength(m) {
  if (!m) return '';
  return m >= 1000 ? (m / 1000).toFixed(2) + ' کیلومتر' : m.toFixed(2) + ' متر';
}

function formatArea(m2) {
  if (!m2) return '';
  return m2 >= 10000 ? (m2 / 10000).toFixed(2) + ' هکتار' : m2.toFixed(2) + ' متر مربع';
}

function polygonAreaFromLonLat(coords) {
  const R = 6378137;
  const rad = coords.map(([lon, lat]) => [lon * Math.PI / 180, lat * Math.PI / 180]);
  let area = 0;
  for (let i = 0; i < rad.length; i++) {
    const [lon1, lat1] = rad[i];
    const [lon2, lat2] = rad[(i + 1) % rad.length];
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2);
}

// محاسبه‌ی طول/محیط/مساحت و لیست نقاط، برای تب «اندازه‌ها»
function buildMeasureInfo(draw, cartesianPositions) {
  formPoints.value = cartesianPositions.map((p, i) => {
    const c = Cesium.Cartographic.fromCartesian(p);
    return {
      row: i + 1,
      lon: Cesium.Math.toDegrees(c.longitude).toFixed(6),
      lat: Cesium.Math.toDegrees(c.latitude).toFixed(6)
    };
  });

  let length = 0, perimeter = 0, area = 0;

  if (draw === 'polyline') {
    for (let i = 1; i < cartesianPositions.length; i++) {
      length += Cesium.Cartesian3.distance(cartesianPositions[i - 1], cartesianPositions[i]);
    }
  }

  if (draw === 'polygon') {
    for (let i = 1; i < cartesianPositions.length; i++) {
      perimeter += Cesium.Cartesian3.distance(cartesianPositions[i - 1], cartesianPositions[i]);
    }
    perimeter += Cesium.Cartesian3.distance(cartesianPositions[cartesianPositions.length - 1], cartesianPositions[0]);
    area = polygonAreaFromLonLat(formPoints.value.map(p => [Number(p.lon), Number(p.lat)]));
  }

  if (draw === 'circle') {
    perimeter = 2 * Math.PI * radius;
    area = Math.PI * radius * radius;
  }

  formMeasure.value = {
    length: length ? formatLength(length) : '',
    perimeter: perimeter ? formatLength(perimeter) : '',
    area: area ? formatArea(area) : '',
    radius: draw === 'circle' ? formatLength(radius) : ''
  };
}

// اعمال زنده‌ی رنگ/ضخامت روی entity در حال ترسیم، از تب «استایل»
function applyStyleToShape() {
  const entity = drawDataSource.entities.getById(shape_id);
  if (!entity) return;

  const border = Cesium.Color.fromCssColorString(styleData.value.borderColor);
  const fillAlpha = 1 - (styleData.value.transparency / 100);
  const fill = Cesium.Color.fromCssColorString(styleData.value.fillColor).withAlpha(fillAlpha);
  const width = Number(styleData.value.width) || 1;

  if (entity.polyline) {
    entity.polyline.material = border;
    entity.polyline.width = width;
  }
  if (entity.polygon) {
    entity.polygon.material = fill;
    entity.polygon.outlineColor = border;
    entity.polygon.outlineWidth = width;
  }
  if (entity.ellipse) { // دایره
    entity.ellipse.material = fill;
    entity.ellipse.outlineColor = border;
    entity.ellipse.outlineWidth = width;
  }

  if (shape.value) {
    shape.value.color = styleData.value.borderColor;
    shape.value.outlineColor = styleData.value.borderColor;
    shape.value.width = width;
  }
  color.value = styleData.value.borderColor;
}

function finishDrawing(draw, positions) {
  props.viewer.scene.canvas.style.cursor = 'default';
  buildMeasureInfo(draw, Array.isArray(positions) ? positions : [positions]);

  if (draw == "point") {
    if (!positions ) return;

    const carto = Cesium.Cartographic.fromCartesian(positions);

    shape.value = {
      type: "point",
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      color : '#333',
      show: true
    };

  } else if (draw == "multi_point") {

    shape.value = {
      type: "multi_point",
      positions: positions.map(p => {
        const c = Cesium.Cartographic.fromCartesian(p);
        return {
          lon: Cesium.Math.toDegrees(c.longitude),
          lat: Cesium.Math.toDegrees(c.latitude),
          height: c.height,
          color : p.color
        };
      }),
      width: 5,
      color: color.value,
      show: true
    };
  } else if (draw == "circle") {
    if (!positions) return;

    const carto = Cesium.Cartographic.fromCartesian(positions);

    shape.value = {
      type: "circle",
      center: {
        lon: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
        height: carto.height
      },
      radius,
      color: color.value,
      show: true
    };

  } else if (draw == "polyline") {
    if (positions.length < 2) return;

    shape.value = {
      type: draw,
      positions: positions.map(p => {
        const c = Cesium.Cartographic.fromCartesian(p);
        return {
          lon: Cesium.Math.toDegrees(c.longitude),
          lat: Cesium.Math.toDegrees(c.latitude),
          height: c.height
        };
      }),
      width: 3,
      color: color.value,
      show: true
    };
  } else if (draw == "polygon") {
    if (positions.length < 3) return;

    const coords = positions.map(p => {
      const c = Cesium.Cartographic.fromCartesian(p);
      return {
        lon : Cesium.Math.toDegrees(c.longitude),
        lat : Cesium.Math.toDegrees(c.latitude),
        height:  0, //c.height
      };
    });

    coords.push(coords[0]);

    shape.value ={
      type: "polygon",
      positions: coords,
      color: color.value,
      outlineColor : color.value,
      show: true
    };
  }

}

const onFileChange = (e) => {
  const file = e.target.files[0];
  attch_file.value = file;
  imagePreview.value = file ? URL.createObjectURL(file) : null;
};

const savePin = async () => {
  let obj = drawings.value.find( a=> a.id == shape_id);
  if (obj) {
    obj.description = formData.value.description;
    shape.value.description = formData.value.description;
  }
  let pin = {
    id : shape_id ,
    name : formData.value.name,
    descr : formData.value.description,
    shape : shape.value,
    date :  new Date(),
    save : -1,
    type : 'draw'
  }
  if (attch_file.value) {
    pin.filename = attch_file.value.name;
    pin.file = attch_file.value;
  }
  if (SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save?? -1;
    props.pins[SelectGroup.value].children.push(pin);
  }
  else {
      pin.parent_id = -1;
      props.pins.push(pin);
  }

  drawMode.value='';

  showForm.value = false;
  formData.value = { name: "", description: "", file: null };

  // چون شکل ذخیره شد، دیگر نباید در صورت بستن پنجره پاک شود
  currentShapeEntities = [];
  formPoints.value = [];
  imagePreview.value = null;
  activeFormTab.value = 'info';

  // fetchPins();
  // childRef.value.fetchPins();
  await saveOneWorks(pin);
};

const saveOneWorks = async (item) => {
  try {

    const formData = new FormData();

    // const payload = props.pins
    //     .filter(item => item.save < 0)
    //     .map(item => {
    formData.append("type", item.type);
    formData.append("name", item.name);
    formData.append("obj_id", item.id);
    formData.append("parent_id", item.parent_id);

    let payload = {};
    if (item.type === 'file') {
      formData.append("file", item.file);
    } else {
      formData.append("content", JSON.stringify(toRaw(item.shape)));
    }

    const res = await axios.post(SERVER + '/api/Save/myWork/' + authStore.user.id, formData,
        { headers: { "Content-Type": "multipart/form-data" } })

    console.log(res.data)

  } catch (err) {
    console.error(err)
  }
}

const saveWork = async () => {
  try {

    const payload = props.pins
        .filter(item => item.save < 0)
        .map(item => {
          if (item.type === 'file') {
            return {
              type: item.type,
              name: item.name,
              id: item.id,
            }
          } else {
            return {
              type: item.type,
              name: item.name,
              id: item.id,
              content: JSON.stringify(toRaw(item.shape))
            }
          }
        })

    const res = await axios.post(SERVER + '/api/Save/myWork/' + authStore.user?.id, payload)
    console.log(res.data)

  } catch (err) {
    console.error(err)
  }
}

function inactiveDrawing() {
  showForm.value = false;
  document.body.style.cursor = "default";
  //drawMode.value='';
  stopMeasure();
  pickForForm.value = false;
  if (handler) {
    handler.destroy();
    handler = null;
  }

}

function clearSelectedOrAll() {
  if (selectedEntity.value) {
    drawDataSource.entities.remove(selectedEntity.value);
    drawings.value = drawings.value.filter(e => e !== selectedEntity.value);
    selectedEntity.value = null;
  } else {
    drawings.value.forEach(e => drawDataSource.entities.remove(e));
    drawings.value = [];
  }
}

function openSaveDialog() {
  showDialog.value = true
}

const cancelForm = () => {
  showForm.value = false;

  if (drawMode.value === 'multi_point') {
    if (ds) props.viewer.dataSources.remove(ds, true);
    ds = null;
  } else {
    // حذف تمام entity هایی که برای این شکل ساخته شده‌اند (مطمئن‌تر از removeById)
    currentShapeEntities.forEach(ent => drawDataSource.entities.remove(ent));
  }

  currentShapeEntities = [];
  pointList.value = [];
  formPoints.value = [];
  formMeasure.value = { length: '', perimeter: '', area: '', radius: '' };
  imagePreview.value = null;
  activeFormTab.value = 'info';
  formData.value = { name: "", description: "", file: null };
  attch_file.value = null;

  document.body.style.cursor = "default";
  drawMode.value='';

};

function toggleMeasure() {
  emit("disableFeatureInfo");
  measureActive.value = !measureActive.value;
  if (measureActive.value) {
    drawMode.value = 'measure';
    startMeasure();
  } else {
    drawMode.value = '';
    stopMeasure();
  }
}

function startMeasure() {
  const viewer = props.viewer;
  handler2.value = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // کلیک چپ برای اضافه کردن نقطه
  handler2.value.setInputAction((event) => {
    const cartesian = viewer.scene.pickPosition(event.position);
    if (!cartesian) return;

    points.push(cartesian);

    // نمایش نقطه
    const pointEntity = viewer.entities.add({
      position: cartesian,
      point: { pixelSize: 8, color: Cesium.Color.RED },
    });
    entities.push(pointEntity);

    // نمایش خط بین نقاط
    if (points.length > 1) {
      if (polylineEntity) {
        polylineEntity.polyline.positions = [...points];
      } else {
        polylineEntity = viewer.entities.add({
          polyline: {
            positions: points,
            width: 3,
            material: Cesium.Color.GREEN,
          },
        });
        entities.push(polylineEntity);
      }

      // محاسبه و نمایش فاصله بین آخرین دو نقطه
      const lastIndex = points.length - 1;
      const distance = Cesium.Cartesian3.distance(
          points[lastIndex - 1],
          points[lastIndex]
      );
      let tmp = distance
      if (distance > 1000)
        tmp =(distance / 1000).toFixed(2) + ' km'
      else
        tmp = distance.toFixed(0)+ ' m'

      const labelEntity = viewer.entities.add({
        position: points[lastIndex],
        label: {
          text: tmp,
          font: "16px sans-serif",
          fillColor: Cesium.Color.BLACK,
          backgroundColor: Cesium.Color.WHITE,
          showBackground: true,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      });
      entities.push(labelEntity);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // کلیک راست برای پاک کردن مسیر
  handler2.value.setInputAction(() => {
    points.length = 0;
    entities.forEach((e) => viewer.entities.remove(e));
    entities.length = 0;
    polylineEntity = null;
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function stopMeasure() {
  const viewer = props.viewer;
  if (handler2.value) {
    handler2.value.destroy();
    handler2.value = null;
  }
  points.length = 0;
  entities.forEach((e) => viewer.entities.remove(e));
  entities.length = 0;
  polylineEntity = null;
  measureActive.value=false;
}

defineExpose({ inactiveDrawing });
</script>