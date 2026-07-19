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
    <div v-if="showForm" class="absolute inset-0 bg-black/40 flex items-end justify-end px-14 py-32 z-50" @contextmenu.prevent>
      <div class="bg-white rounded-2xl p-6 w-84 shadow-xl relative">
        <button @click="cancelForm" class="absolute top-4 left-4 text-gray-500 hover:text-black">✕</button>
        <h2 class="text-md font-semibold mb-3">افزودن ترسیم جدید</h2>

        <form @submit.prevent="savePin">
          <label class="block mb-2 text-sm font-medium">نام</label>
          <input v-model="formData.name" type="text" class="w-full border rounded-lg p-2 mb-3" required />

          <label class="block mb-2 text-sm font-medium">توضیحات</label>
          <textarea v-model="formData.description" class="w-full border rounded-lg p-2 mb-3" rows="3"></textarea>

          <label class="block mb-2 text-sm font-medium">فایل ضمیمه</label>
          <input type="file" @change="onFileChange" class="w-full border rounded-lg p-2 mb-4" />

          <div class="flex justify-end gap-2">
            <button type="button" @click="cancelForm" class="px-4 py-2 bg-gray-300 rounded-lg">لغو</button>
            <button type="button" @click="savePin" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ذخیره</button>
          </div>
        </form>
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

function finishDrawing(draw, positions) {
  props.viewer.scene.canvas.style.cursor = 'default';

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
  attch_file.value = e.target.files[0];
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
  //isPinMode.value = false;
  if (drawMode.value === 'multi_point') {
    props.viewer.dataSources.remove(ds, true);
  } else {
  drawDataSource.entities.removeById(shape_id);
  }
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
