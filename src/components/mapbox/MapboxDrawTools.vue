<template>
  <DrawToolbar
    ref="toolbarComponent"
    :map="map"
    :drawMode="drawMode"
    :pickForForm="pickForForm"
    :baseMaps="baseMaps"
    @toggleMeasure="toggleMeasure"
    @togglePointPick="togglePointPick"
    @setDrawMode="setDrawMode"
    @setBaseLayer="$emit('setBaseLayer', $event)"
    @start-cut-mode="startCutMode" 
  />

  <transition name="fade">
    <div
      v-if="showForm"
      class="absolute inset-0 z-50 pointer-events-none"
      @contextmenu.prevent
    >
      <DrawPanel
        ref="panelComponent"
        :panelReady="panelReady"
        :panelPositioned="panelPositioned"
        :panelTranslate="panelTranslate"
        :title="getDrawTypeName()"
        :tabs="tabs"
        :activeTab="activeTab"
        :drawMode="drawMode"
        :shape="shape"
        :coordinateSystem="coordinateSystem"
        :livePointCount="livePointCount"
        :liveTotalLength="liveTotalLength"
        :liveArea="liveArea"
        :liveRadius="liveRadius"
        :displayPoints="displayPoints"
        :formData="formData"
        :attchFileName="attch_file?.name || ''"
        :nameError="nameError"
        :isSaveEnabled="isSaveEnabled"
        :formatCoordinate="formatCoordinate"
        @startDrag="startDrag"
        @cancel="cancelForm"
        @save="handleSave"
        @update:activeTab="activeTab = $event"
        @update:coordinateSystem="coordinateSystem = $event"
        @update:formData="formData = $event"
        @fileChange="onFileChange"
        @update:shapeColor="shape.color = $event"
        @update:shapeOpacity="shape.opacity = $event"
        @update:shapeWidth="shape.width = $event"
        @copyCoordinates="copyCoordinates"
      />
    </div>
  </transition>

  <Loading :active="loading" />
</template>

<script setup>
import { ref, watch, inject, nextTick } from "vue";
import Loading from "../Loading.vue";
import DrawToolbar from "./DrawToolbar.vue";
import DrawPanel from "./DrawPanel.vue";
import { useDrawing } from "../../composables/useDrawing";
import { useDragPanel } from "../../composables/useDragPanel";

const props = defineProps({
  map: { type: Object, required: true },
  pins: { type: Object, required: true },
  baseMaps: { type: Array, default: () => [] },
});

const emit = defineEmits(["pickPoint", "setBaseLayer"]);

const SelectGroup = inject("SelectGroup", null);

const toolbarComponent = ref(null);
const panelComponent = ref(null);

const {
  loading,
  drawMode, // <--- اطمینان حاصل کنید این وجود دارد
  pickForForm,
  showForm,
  formData,
  shape,
  attch_file,
  nameError,
  activeTab,
  coordinateSystem,
  tabs,
  displayPoints,
  livePointCount,
  liveTotalLength,
  liveArea,
  liveRadius,
  isSaveEnabled,
  togglePointPick,
  setDrawMode,
  toggleMeasure,
  cancelForm,
  handleSave,
  onFileChange,
  formatCoordinate,
  copyCoordinates,
  getDrawTypeName,
  inactiveDrawing,
  startCutMode, // <--- تابع جدید برش اضافه شد
} = useDrawing(props.map, props.pins, emit, SelectGroup);

const {
  panelReady,
  panelPositioned,
  panelTranslate,
  startDrag,
  positionPanelBesideToolbar,
} = useDragPanel(showForm);

watch(showForm, async (newVal) => {
  if (newVal) {
    await nextTick();
    const toolbarEl = toolbarComponent.value?.toolbarEl;
    const panelEl = panelComponent.value?.panelEl;
    positionPanelBesideToolbar(toolbarEl, panelEl);
  }
});

// <--- متغیرها و توابع جدید را expose می‌کنیم تا کامپوننت والد بتواند به آن‌ها دسترسی داشته باشد
defineExpose({ 
  inactiveDrawing,
  drawMode,
  startCutMode 
});
</script>

<!-- استایل‌ها بدون تغییر باقی می‌مانند -->