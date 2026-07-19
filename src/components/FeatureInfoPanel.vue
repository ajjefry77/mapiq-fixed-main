<template>
  <div class="absolute top-[calc(var(--top)+25px)] left-[12px]">
    <button @click="toggleHandler"  title="اطلاعات"
            :class="[ 'w-8 h-8 rounded flex items-center justify-center shadow-md', isActive ? 'text-white bg-blue-500' : 'text-black bg-gray-200']">
            <i class="fas fa-info font-bold"></i>
    </button>
  </div>

  <div  v-if="featureInfo" class="absolute bottom-[10px] right-[350px] bg-white shadow-lg rounded-xl p-4 w-80 max-h-[500px] min-h-[250px] ">
    <button @click="cancel" class="absolute top-[10px] left-[15px] text-gray-500 hover:text-red-600" >
      ✖
    </button>
    <button @click="clearSelection" class="absolute top-[10px] left-[40px] text-gray-500 hover:text-green-600" >
      <i class="fas fa-check" />
    </button>
    <div class="flex mb-2 ">
      <button
          class="px-2 py-1 text-sm rounded"
          :class="activeTab === 'info' ? 'bg-blue-500 text-white' : 'bg-white border'"
          @click="activeTab = 'info'" >
        مشخصات
      </button>
      <button
          class="px-2 py-1 text-sm rounded"
          :class="activeTab === 'edit' ? 'bg-blue-500 text-white' : 'bg-white border'"
          @click="activeTab = 'edit'" >
         استایل
      </button>
    </div>

    <div v-if="activeTab === 'info'">
      <div class="flex flex-col gap-2 items-center justify-between mt-0 mb-2">

        <input type="text" v-model="shapeName" class="w-full h-8 text-sm cursor-pointer px-2 border border-gray-400 rounded"  />

        <ul class="space-y-1 text-sm w-full">
          <li v-if="featureInfo.description" class="max-h-[300px] w-full overflow-y-auto">
            <span class="font-semibold">توضیحات : </span>
            <!--        {{ featureInfo.description }}-->
            <span class="font-semibold" dir="rtl" v-html="featureInfo.description"></span>
          </li>

          <li v-if="featureInfo.length" class="mt-4">
            <span class="font-semibold leading-loose">طول : </span>
            {{ featureInfo.length }}
          </li>

          <li v-if="featureInfo.perimeter">
            <span class="font-semibold leading-loose mt-1" >محیط : </span>
            {{ featureInfo.perimeter }}
          </li>

          <li v-if="featureInfo.area">
            <span class="font-semibold leading-loose mt-1">مساحت : </span>
            {{ featureInfo.area }}
          </li>
        </ul>

      </div>
    </div>

    <div v-if="activeTab === 'edit'">
      <div class="h-4"/>
      <div  v-if="showBgColor" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> رنگ زمینه :</span>
        <label class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer" title="انتخاب رنگ">
          <span class="w-5 h-5 " :style="{ backgroundColor: color }"></span>
          <input type="color" v-model="bgColor" @change="SelectBgColor" class="w-40 h-8 cursor-pointer" />
        </label>
      </div>
      <div v-if="showBgColor" class="w-full">
        <label class="text-sm font-semibold">
          شفافیت: {{ transparency }}%
        </label>

        <input  type="range"  min="0"   max="100" v-model="transparency" class="w-full" @change="SelectBgColor"/>
      </div>

      <div   v-if="showBorderColor" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> رنگ حاشیه :</span>
        <label class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer" title="انتخاب رنگ">
          <span class="w-5 h-5 " :style="{ backgroundColor: color }"></span>
          <input type="color" v-model="borderColor"  @change="SelectBorderColor"  class="w-40 h-8 cursor-pointer" />
        </label>
      </div>

      <div   v-if="showWidth" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> رنگ حاشیه :</span>
        <input type="number"  v-model="widthh"   class="w-40 h-8 cursor-pointer px-3 border border-gray-400 rounded" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted, watch } from "vue";
import axios from "axios";
//import * as turf from "@turf/turf";

const SERVER = import.meta.env.VITE_SERVER //?? 'http://localhost:3001';
const props = defineProps({
  viewer: Object,
  pins : Object,
  layersLoaded: Array
});

const showColorPicker = ref('bg');
const bgColor = ref('#ff0000');
const borderColor = ref('#0000ff');
const widthh = ref(3);
const shapeName = ref('');
const showBgColor = ref('#ff0000');
const transparency = ref(50);
const showBorderColor = ref('#0000ff');
const showWidth = ref(3);
const selectEntity = ref(null);
let cur_pin = null;

const activeTab = ref('info');
const handler = ref(null);
const isActive = ref(true);
const featureInfo = ref(null);
let highlightEntity = null;
const emit = defineEmits(["disableDrawing"]);
let mode='select'
let pre_val = {}


onMounted(async () => {
  setTimeout(() => {
    activate()
  }, 2500)
});

watch(activeTab, async (newTab) => {
  if (newTab === 'info') {
    //await nextTick() // صبر می‌کند تا input در DOM رندر شود
    shapeInput.value?.focus()
  }
})

function SelectBorderColor() {
  updateStyle(selectEntity.value,borderColor.value,null,widthh.value)
}

function SelectBgColor(type) {
  updateStyle(selectEntity.value,null,bgColor.value,widthh.value)
}

// فعال/غیرفعال
function toggleHandler() {
  if (!isActive.value) activate();
  else deactivate();
}

function activate() {
  if (!props.viewer) return;
  emit("disableDrawing");
  isActive.value = true;

  handler.value = new Cesium.ScreenSpaceEventHandler(props.viewer.scene.canvas);

  handler.value.setInputAction(onClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function deactivate() {
  isActive.value = false;

  if (handler.value) {
    handler.value.destroy();
    handler.value = null;
  }

  clearSelection();
}

function disableEdit() {
  isActive.value = false;

  if (handler.value) {
    handler.value.destroy();
    handler.value = null;
  }
  props.viewer.scene.canvas.style.cursor = 'default';
  featureInfo.value = null;
  clearEditHandles();
}

// کلیک
function onClick(click) {
  const picked = props.viewer.scene.pick(click.position);

  if (!picked || !picked.id) return;

  const entity = picked.id;

  if (mode == 'edit') save();

  selectEntity.value = picked.id;

    getEntityValue(entity)
    enableEditing(entity)
    showFeatureInfo(entity);
}

// استخراج اطلاعات
function showFeatureInfo(entity) {

  const info = {};

  // description
  if (entity.description) {
    info.description = entity.description.getValue
        ? entity.description.getValue()
        : entity.description;
  }

  const time = Cesium.JulianDate.now();

  // ---------------- POLYLINE ----------------
  if (entity.polyline) {

    const positions = entity.polyline.positions.getValue(Cesium.JulianDate.now());

    let length = 0;

    for (let i = 1; i < positions.length; i++) {
      length += Cesium.Cartesian3.distance(positions[i-1], positions[i]);
    }

    info.length = formatLength(length);

    // اگر حداقل سه نقطه داشت مساحت هم حساب می‌کنیم
    if (positions.length >= 3) {
      const area = computePolylineArea(positions);
      info.area = formatArea(area);
    }
  }

  // ---------------- POLYGON ----------------
  if (entity.polygon) {

    const hierarchy = entity.polygon.hierarchy.getValue(time);

    const positions = hierarchy.positions;

    let perimeter = 0;

    for (let i = 1; i < positions.length; i++) {
      perimeter += Cesium.Cartesian3.distance(
          positions[i - 1],
          positions[i]
      );
    }

    perimeter += Cesium.Cartesian3.distance(
        positions[positions.length - 1],
        positions[0]
    );

    info.perimeter = formatLength(perimeter)

    // cur_pin = findPinById(props.pins, selectEntity.value.id);
    // const pos = cur_pin.shape.positions.map(p => [p.lon, p.lat])
    // const polygon = turf.polygon([
    //   [...pos, pos[0]]
    // ])
    // const area = turf.area(polygon)

    const area = calculatePolygonArea(selectEntity.value)

    info.area = formatArea(area);

  }

  featureInfo.value = info;

  //highlight(entity);
}

function calculatePolygonArea(entity) {
  const viewer = props.viewer;
  if (!entity?.polygon) {
    throw new Error("Entity is not a polygon");
  }

  const time = viewer.clock.currentTime;

  const hierarchy = entity.polygon.hierarchy.getValue(time);

  if (!hierarchy?.positions || hierarchy.positions.length < 3) {
    return 0;
  }

  // تبدیل Cartesian3 به Cartographic
  const cartographics = hierarchy.positions.map(pos =>
      Cesium.Cartographic.fromCartesian(pos)
  );

  // محاسبه مساحت روی Ellipsoid
  const coordinates = cartographics.map(c => [
    Cesium.Math.toDegrees(c.longitude),
    Cesium.Math.toDegrees(c.latitude)
  ]);

  return polygonArea(coordinates);
}

function polygonArea(coords) {
  const radians = coords.map(([lon, lat]) => [
    Cesium.Math.toRadians(lon),
    Cesium.Math.toRadians(lat)
  ]);

  const R = Cesium.Ellipsoid.WGS84.maximumRadius;

  let area = 0;

  for (let i = 0; i < radians.length; i++) {
    const [lon1, lat1] = radians[i];
    const [lon2, lat2] = radians[(i + 1) % radians.length];

    area += (lon2 - lon1) *
        (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * R * R / 2.0);

  return area; // متر مربع
}

function computePolylineArea_new(positions) {

  if (!positions || positions.length < 3) return 0;

  const coords = positions.map(p => {
    const c = Cesium.Cartographic.fromCartesian(p);
    return {
      x: Cesium.Math.toDegrees(c.longitude),
      y: Cesium.Math.toDegrees(c.latitude)
    };
  });

  // بستن شکل
  coords.push(coords[0]);

  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i].x * coords[i + 1].y;
    area -= coords[i + 1].x * coords[i].y;
  }

  area = Math.abs(area) / 2;

  // تبدیل درجه به متر تقریبی
  const meterPerDegree = 111319.9;

  return area * meterPerDegree * meterPerDegree;
}

function computePolylineArea(positions) {

  if (!positions || positions.length < 3) return 0;

  // بستن شکل (آخر به اول)
  const closedPositions = [...positions, positions[0]];

  const polygon = Cesium.PolygonGeometry.fromPositions({
    positions: closedPositions,
    vertexFormat: Cesium.VertexFormat.POSITION_ONLY
  });

  const geometry = Cesium.PolygonGeometry.createGeometry(polygon);

  if (!geometry) return 0;

  // استخراج مختصات
  const values = geometry.attributes.position.values;

  let area = 0;

  for (let i = 0; i < values.length; i += 9) {

    const p1 = Cesium.Cartesian3.fromArray(values, i);
    const p2 = Cesium.Cartesian3.fromArray(values, i + 3);
    const p3 = Cesium.Cartesian3.fromArray(values, i + 6);

    const v1 = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());
    const v2 = Cesium.Cartesian3.subtract(p3, p1, new Cesium.Cartesian3());

    const cross = Cesium.Cartesian3.cross(v1, v2, new Cesium.Cartesian3());

    area += Cesium.Cartesian3.magnitude(cross) / 2;
  }

  return Math.abs(area);
}

function formatLength(lengthMeters) {

  if (!lengthMeters) return "0 متر";

  if (lengthMeters >= 1000) {
    return (lengthMeters / 1000).toFixed(2) + " کیلومتر";
  }

  return lengthMeters.toFixed(2) + " متر";
}

function formatArea(areaMeters) {

  if (!areaMeters) return "0 متر مربع";

  if (areaMeters >= 10000) {
    return (areaMeters / 10000).toFixed(2) + " هکتار";
  }

  return areaMeters.toFixed(2) + " متر مربع";
}

function highlight(entity) {

  removeHighlight();

  const time = Cesium.JulianDate.now();

  // polygon
  if (entity.polygon) {

    const hierarchy = entity.polygon.hierarchy.getValue(time);

    highlightEntity = props.viewer.entities.add({
      polygon: {
        hierarchy: hierarchy,
        material: Cesium.Color.YELLOW.withAlpha(0.4),
        outline: true,
        outlineColor: Cesium.Color.RED
      }
    });

  }

  // polyline
  else if (entity.polyline) {

    const positions = entity.polyline.positions.getValue(time);

    highlightEntity = props.viewer.entities.add({
      polyline: {
        positions: positions,
        width: 8,
        material: Cesium.Color.YELLOW.withAlpha(0.6),
      }
    });

  }

  // point
  else if (entity.point) {

    const pos = entity.position.getValue(time);

    highlightEntity = props.viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 20,
        color: Cesium.Color.YELLOW
      }
    });

  }

}

function removeHighlight() {
  if (highlightEntity && props.viewer) {
    props.viewer.entities.remove(highlightEntity);
    highlightEntity = null;
  }
}

function clearSelection() {
  save()
  props.viewer.scene.canvas.style.cursor = 'default';
  featureInfo.value = null;
  //removeHighlight();
  clearEditHandles();
  mode = 'select'
  activate();
}

function cancel() {
  props.viewer.scene.canvas.style.cursor = 'default';
  featureInfo.value = null;
  transparency.value = pre_val.transparency;
  updateStyle(selectEntity.value,pre_val.borderColor,pre_val.bgColor,pre_val.width)
  clearEditHandles();
  mode = 'select'
  activate();
}

function findPinById(items, id) {
  for (const item of items) {
    if (item.id == id) return item;

    if (item.children && item.children.length) {
      const found = findPinById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

async function save() {
  try {
    if (!selectEntity.value) return;
    let pin;
    if (selectEntity.value.description == 'multi_point') {
      pin = findPinById(props.pins, selectEntity.value.sh_id);
      const cartesian = selectEntity.value.position.getValue(Cesium.JulianDate.now());
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const color = bgColor;
      pin.shape.positions[selectEntity.value.name] = {lon, lat, color};
      const updatedData = {
        ...pin.shape,
        positions: pin.shape.positions,
        width: selectEntity.value.width,
      };

      await axios.put(SERVER + '/api/save/myWork/' + pin.save, {  name : shapeName.value, content: JSON.stringify(updatedData) });
      pin.name = shapeName.value;
      return;
    }



    if (selectEntity.value._pinId) {
      pin = findPinById(props.pins, selectEntity.value._pinId);
      await save_kml(pin, pin.shape)
    } else {
      pin = findPinById(props.pins, selectEntity.value.id);

      // دریافت نوع shape (مثلا "polyline" یا "polygon")
      const type = pin.shape.type;

      // دسترسی داینامیک به ویژگی entity
      const entityProperty = selectEntity.value[type];

      // استخراج پوزیشن‌ها بر اساس نوع
      let rawPositions;
      if (type === 'polyline') {
        rawPositions = entityProperty.positions.getValue();
      } else if (type === 'polygon') {
        // در پلی‌گون، پوزیشن‌ها معمولاً در hierarchy هستند
        rawPositions = entityProperty.hierarchy.getValue().positions;
      }

      // تبدیل به فرمت دیتابیس (همان کد قبلی)
      const formattedPositions = rawPositions.map(pos => {
        const cartographic = Cesium.Cartographic.fromCartesian(pos);
        return {
          lon: Cesium.Math.toDegrees(cartographic.longitude),
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          height: cartographic.height
        };
      });

      const updatedData = {
        ...pin.shape,
        positions: formattedPositions,
        width: selectEntity.value.width,
      };

      await axios.put(SERVER + '/api/save/myWork/' + pin.save, {
        name: shapeName.value,
        type: 'draw',
        content: JSON.stringify(updatedData)
      });
    }
    pin.name = shapeName.value;
  } catch (error) {
    console.error("خطا در ذخیره‌سازی:", error);
  }
}

async function save_kml(pin, entity){
  const result = await Cesium.exportKml({
    entities: entity.entities,
    kmz: true
  });

  const formData = new FormData();

  formData.append("name", shapeName.value);
  formData.append("document_id", pin.save);
  formData.append("type", "file");
  formData.append("file", result.kmz, "file.kmz");

  await axios.put(`${SERVER}/api/save/myWork/${pin.save}`, formData,{
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
  );
  /*  const formData = {
    name: shapeName.value,
    type: "file",
    kmz: result.kmz.toString("base64") // مهم
  };

  await axios.put(`${SERVER}/api/save/myWork/${pin.save}`, formData);*/
}

//******************************************************************************
// متغیرهای سراسری برای مدیریت ویرایش
let editHandles = []
let handler1 = null

const editState = {
  activeHandle: null,
  draggedHandle: null,
  isDragging: false,
  mouseMoved: false
}

// ۱. تابع فعال‌سازی ویرایش
function enableEditing(entity) {

  mode = 'edit'
  props.viewer.scene.canvas.style.cursor = 'pointer';

  if (handler.value) {
    handler.value.destroy()
    handler.value = null
  }

  clearEditHandles()

  const ds = props.viewer.dataSources.getByName("pins")[0]
  const positions = getPositions(entity)

  positions.forEach( (position, index) => {

        const handle = ds.entities.add({ position,
              point: {
                pixelSize: 8,
                color: Cesium.Color.WHITE.withAlpha(0.3),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                disableDepthTestDistance:
                Number.POSITIVE_INFINITY
              },

              properties: {
                index,
                parentEntity: entity,
                isEditHandle: true
              }
            })

        editHandles.push(handle)
      }
  )

  setupEditHandler()
}

// ۲. مدیریت رویدادهای موس برای درگ کردن (Drag & Drop)
function setupEditHandler() {
  if (handler1) handler1.destroy();
  handler1 = new Cesium.ScreenSpaceEventHandler(props.viewer.scene.canvas);

  // شروع درگ
  handler1.setInputAction((click) => {

        const picked = props.viewer.scene.pick(click.position)
        if (!Cesium.defined(picked) || !picked.id || !picked.id.properties?.isEditHandle?.getValue()) return

        editState.mouseMoved = false
        editState.draggedHandle = picked.id
        editState.isDragging = true
        setActiveHandle( picked.id )
        props.viewer.scene.screenSpaceCameraController.enableInputs = false
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

  // در حین جابجایی موس
  handler1.setInputAction((move) => {

        if ( !editState.isDragging || !editState.draggedHandle ) return

        const pos = props.viewer.camera.pickEllipsoid( move.endPosition )
        if (!pos) return

        editState.mouseMoved = true
        editState.draggedHandle.position = pos
        const parent = editState.draggedHandle.properties.parentEntity.getValue()
        const index = editState.draggedHandle.properties.index.getValue()
        const pts = getPositions(parent)
        pts[index] = pos
        setPositions( parent, pts )

      }, Cesium.ScreenSpaceEventType .MOUSE_MOVE )

  // پایان درگ
  handler1.setInputAction(() => {

    editState.isDragging = false

    editState.draggedHandle = null

    editState.mouseMoved = false

    props.viewer.scene.screenSpaceCameraController.enableInputs = true

  }, Cesium.ScreenSpaceEventType.LEFT_UP)

  handler1.setInputAction((click) => {

        const dragged = editState.draggedHandle
        const wasMoved = editState.mouseMoved
        editState.isDragging = false
        editState.draggedHandle = null

        props.viewer.scene.screenSpaceCameraController.enableInputs = true

        if (!dragged) {
          const picked = props.viewer.scene.pick(click.position)

          if (picked && picked.id) {
            return
          }

          if (!editState.activeHandle) {
            return
          }

          const pos = props.viewer.camera.pickEllipsoid(click.position)
          if (!pos) return
          const parent = editState.activeHandle.properties.parentEntity.getValue()
          const index = editState.activeHandle.properties.index.getValue()
          const pts = getPositions(parent)
          pts.splice(index + 1,0, pos )
          setPositions(parent, pts)
          rebuildHandles( parent,index + 1 )
        }

      }, Cesium.ScreenSpaceEventType.LEFT_CLICK )

  handler1.setInputAction(() => {

        const activeHandle = editState.activeHandle
        if (!activeHandle)  return

        const parent =activeHandle.properties.parentEntity.getValue()
        const index = activeHandle.properties.index.getValue()
        const pts = getPositions(parent)

        if (parent.polyline &&  pts.length <= 2 )  return

        if ( parent.polygon && pts.length <= 3 )   return

        pts.splice(index, 1)
        setPositions( parent, pts )
        const previousIndex = Math.max(0, index - 1)
        rebuildHandles(  parent,  previousIndex )

      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK )

}

// تابع کمکی پاکسازی
function clearEditHandles() {

  //props.viewer.scene.canvas.style.cursor = 'default';

  const ds =
      props.viewer.dataSources
          .getByName("pins")[0]

  editHandles.forEach(h =>
      ds.entities.remove(h)
  )

  editHandles = []

  editState.activeHandle = null
  editState.draggedHandle = null
  editState.isDragging = false
}

function getPositions(entity) {

  if (entity.point && entity.position) {
    return [entity.position.getValue(Cesium.JulianDate.now())]
  }

  if (entity.polyline) {
    return [
      ...entity.polyline.positions
          .getValue()
    ]
  }

  if (entity.polygon) {
    return [
      ...entity.polygon.hierarchy
          .getValue()
          .positions
    ]
  }

  return []
}

function setPositions(entity, positions ) {

  if (entity.point) {
    entity.position = positions[0];
  }

  if (entity.polyline) {

    entity.polyline.positions =
        positions

    return
  }

  if (entity.polygon) {

    entity.polygon.hierarchy =
        new Cesium.PolygonHierarchy(
            positions
        )
  }
}

function setActiveHandle(handle) {

  editHandles.forEach(h => {
    h.point.color =
        Cesium.Color.YELLOW
  })

  handle.point.color =
      Cesium.Color.RED

  editState.activeHandle =
      handle
}

function rebuildHandles( entity, activeIndex = null) {

  enableEditing(entity)

  if (
      activeIndex !== null &&
      editHandles[activeIndex]
  ) {

    setActiveHandle(
        editHandles[activeIndex]
    )
  }
}


function updateStyle(entity, borderColor, bgColor, newWidth) {
  if (!entity) {
    console.warn("updateStyle: Entity is null or undefined.");
    return;
  }

  const border = borderColor? Cesium.Color.fromCssColorString(borderColor) : undefined;
  const fill = bgColor ? Cesium.Color.fromCssColorString(bgColor).withAlpha(0.5) : undefined;

  const width = newWidth !== undefined && newWidth !== null? Number(newWidth) : undefined;

  const pin = findPinById(props.pins, selectEntity.value.id);
  if (pin) {
    if (borderColor) pin.shape.color = borderColor;
    if (width) pin.shape.width = width;
    if (pin.type = 'polygon') {
      if (borderColor) pin.shape.outlineColor = borderColor;
      if (bgColor) pin.shape.color = bgColor;
    }
  }

  if (entity.polyline) {
    if (border !== undefined) entity.polyline.material = border;
    if (width !== undefined) entity.polyline.width = width;
    return; // استایل اعمال شد، خارج شو
  }

  if (entity.polygon) {
    const alpha = 1 - (transparency.value / 100);
    const fill = bgColor ? Cesium.Color.fromCssColorString(bgColor).withAlpha(alpha) : undefined;
    if (fill !== undefined) entity.polygon.material = fill;

    entity.polygon.outline = true; // اطمینان از فعال بودن outline
    if (border !== undefined) entity.polygon.outlineColor = border;
    entity.polygon.outlineWidth = width;

    // outlineWidth فقط اگر تعریف شده باشد ست می‌شود
    if (width !== undefined && entity.polygon.outlineWidth !== undefined) {
    }
    return;
  }

  if (entity.circle) {
    if (fill !== undefined) entity.circle.material = fill;

    entity.circle.outline = true; // اطمینان از فعال بودن outline
    if (border !== undefined && entity.circle.outlineColor !== undefined) {
      entity.circle.outlineColor = border;
    }
    // outlineWidth فقط اگر تعریف شده باشد ست می‌شود
    if (width !== undefined && entity.circle.outlineWidth !== undefined) {
      entity.circle.outlineWidth = width;
    }
    return;
  }

  if (entity.billboard) {
    if (border !== undefined) entity.billboard.color = border;
    if (width !== undefined && entity.billboard.scale !== undefined) {
      entity.billboard.scale = width;
    }
    return;
  }

  if (entity.point) {
    if (fill !== undefined) entity.point.color = fill;
    // pixelSize اندازه نقطه را بر حسب پیکسل تعیین می‌کند
    if (width !== undefined) entity.point.pixelSize = width;
    return;
  }

  // اگر Entity از نوع دیگری بود که در بالا پوشش داده نشد
  console.warn(`updateStyle: Entity type not supported or graphics not found for entity ID: ${entity.id}`);
}

function getEntityValue(entity) {

  const now = Cesium.JulianDate.now();
  if (selectEntity.value.description == 'multi_point')
    cur_pin = findPinById(props.pins, selectEntity.value.sh_id)
  else if (selectEntity.value._pinId)
    cur_pin = findPinById(props.pins, selectEntity.value._pinId);
  else
    cur_pin = findPinById(props.pins, selectEntity.value.id);
  shapeName.value = cur_pin?.name
  // reset values
  borderColor.value = '#FFFFFF';
  bgColor.value = '#FFFFFF';
  widthh.value = 1;

  // reset visibility
  showBgColor.value = false;
  showBorderColor.value = false;
  showWidth.value = false;

  // ================= POLYLINE =================
  if (entity.polyline) {

    showBorderColor.value = true;
    showWidth.value = true;

    const lineColor = entity.polyline.material?.color?.getValue(now);
    borderColor.value = lineColor?.toCssColorString() || '#FFFFFF';
    widthh.value = entity.polyline.width?.getValue(now) ?? 1;

  }
  // ================= POLYGON =================
  else if (entity.polygon) {

    showBgColor.value = true;
    showBorderColor.value = true;

    const fillColor = entity.polygon.material?.color?.getValue(now);
    const outlineColor = entity.polygon.outlineColor?.getValue(now);
    bgColor.value = fillColor?.toCssColorString() || '#FFFFFF';
    borderColor.value = outlineColor?.toCssColorString() || '#FFFFFF';

  }
  // ================= ELLIPSE =================
  else if (entity.ellipse) {

    showBgColor.value = true;
    showBorderColor.value = true;
    showWidth.value = true;

    const fillColor = entity.ellipse.material?.color?.getValue(now);
    const outlineColor = entity.ellipse.outlineColor?.getValue(now);
    bgColor.value = fillColor?.toCssColorString() || '#FFFFFF';
    borderColor.value = outlineColor?.toCssColorString() || '#FFFFFF';
    widthh.value = entity.ellipse.outlineWidth?.getValue(now) ?? 1;

  }
  // ================= POINT =================
  else if (entity.point) {

    showBgColor.value = true;
    showWidth.value = true;

    const color = entity.point.color?.getValue(now);
    bgColor.value = color?.toCssColorString() || '#FFFFFF';
    widthh.value = entity.point.pixelSize?.getValue(now) ?? 1;

  }
  // ================= BILLBOARD =================
  else if (entity.billboard) {

    showBgColor.value = true;

    const color = entity.billboard.color?.getValue(now);
    bgColor.value = color?.toCssColorString() || '#FFFFFF';

  }

  pre_val = {
    borderColor :borderColor.value,
    bgColor :bgColor.value,
    width :widthh.value,
    transparency : transparency.value
  }


}

defineExpose({ toggleHandler, disableEdit });
</script>

<style>
table tr td {
  text-align: right !important;
  font-family: 'Vazir', sans-serif;
}
</style>