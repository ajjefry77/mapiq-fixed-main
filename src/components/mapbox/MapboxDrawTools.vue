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
  drawMode,
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

defineExpose({ inactiveDrawing });
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.invisible {
  visibility: hidden;
}
.max-h-72::-webkit-scrollbar,
.max-h-32::-webkit-scrollbar {
  width: 4px;
}
.max-h-72::-webkit-scrollbar-track,
.max-h-32::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.max-h-72::-webkit-scrollbar-thumb,
.max-h-32::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
.max-h-72::-webkit-scrollbar-thumb:hover,
.max-h-32::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
