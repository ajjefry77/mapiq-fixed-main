<template>
  <ul class="list-none m-0 p-0">
    <li v-for="(item, idx) in items" :key="item.id" class="border-t border-gray-300">
      <div v-if="item.type === 'group'" class="flex items-center gap-1 cursor-pointer p-0.5 rounded justify-between"
           :style="{ ['paddingRight']: `${depth * 8}px` }" @click.stop="handleSelectGroup(item, idx)"
           :class="{ 'bg-blue-100': selectedGroup === item }" @dragover.prevent @drop="onDrop($event, item)">
        <div>
          <i @click.stop="toggleGroup(item)" class="text-sm"
             :class="item.expanded ? 'fas fa-caret-down text-black' : 'fas fa-caret-left text-black'"></i>
          <span class="font-semibold text-xs leading-8 mr-1">{{ item.name }}</span>
        </div>
        <div class="flex ml-0.5">
          <input v-if="!item.history" type="checkbox" @click="selectedItems(item)" v-model="item.show" class="ml-2 accent-green-600"/>
          <button class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
                  @click="remove(item, idx)" title="حذف پوشه">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>

      <div v-else>
        <MapboxLayerItem v-if="map" :name="item.name" :id="item.id" :depth="depth" :items="items" :item="item" :map="map"
                        :parentGroup="parentGroup" :setSelectedGroup="selectGroup" :idx="idx" :Icons="Icons"
                        :activeItem="activeItem" @change-active="activeItem = $event"/>
      </div>

      <MapboxLayerTree v-if="item.type === 'group' && item.expanded && item.children"
                      :items="item.children" :depth="depth + 1" :map="map"
                      :selectedGroup="selectedGroup" :selectGroup="selectGroup" :parentGroup="item" :Icons="Icons"/>
    </li>
  </ul>
</template>

<script setup>
import { provide, inject, ref } from "vue";
import MapboxLayerItem from "./MapboxLayerItem.vue";
import { useToast } from "vue-toast-notification";
import { useSharedArray } from '../../stores/app';
import axios from "axios";
const { toggleExtended, toggleVisible } = useSharedArray();

const $toast = useToast();
const SERVER = import.meta.env.VITE_SERVER;
const SelectGroup = inject('SelectGroup');
const activeItem = ref(null);

const props = defineProps({
  items: Array,
  map: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedGroup: Object,
  selectGroup: Function,
  parentGroup: Object,
  Icons: Array
});

function remove(item, index) {
  if (item.children && item.children.length > 0) {
    showMessage('برای حذف پوشه باید خالی باشد', 'warning');
    return;
  }
  props.items.splice(index, 1);
}

function selectedItems(item) {
  item.show = !item.show;
  for (const i of item.children) toggle(i);
}

const toggle = (item) => {
  toggleVisible(item.id);
  const sourceId = 'draw-pin-' + item.id;
  if (item.type === 'file') {
    removeFileLayers(item);
  } else if (props.map.getSource(sourceId)) {
    const layers = props.map.getStyle().layers.filter(l => l.id.startsWith(sourceId));
    const visible = !item.shape.show;
    item.shape.show = visible;
    layers.forEach(l => { props.map.setLayoutProperty(l.id, 'visibility', visible ? 'visible' : 'none'); });
  }
};

function removeFileLayers(item) {
  if (item.shape && item.shape._sourceIds) {
    item.shape._sourceIds.forEach(sid => {
      const layers = props.map.getStyle().layers.filter(l => l.id.startsWith(sid));
      layers.forEach(l => props.map.removeLayer(l.id));
      if (props.map.getSource(sid)) props.map.removeSource(sid);
    });
    item.shape.show = false;
  }
}

function toggleGroup(item) {
  item.expanded = !item.expanded;
  toggleExtended(item.id);
}

function handleSelectGroup(item, idx) {
  props.selectGroup(item);
  SelectGroup.value = idx;
}

if (props.depth === 0) {
  provide("map", props.map);
}

function removeLayer(id) {
  const items = props.items;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].id === id) {
      if (items[i].children && items[i].children.length > 0) {
        showMessage('پوشه مورد نظر خالی نیست', 'error');
        return;
      }
      items.splice(i, 1);
      continue;
    }
  }
}

async function onDrop(event, targetGroup) {
  const layerId = event.dataTransfer.getData("layerId");
  const layer = extractLayer(props.items, layerId);
  if (!layer) return;
  if (!targetGroup.children) targetGroup.children = [];
  targetGroup.children.push(layer);
  await axios.post(SERVER + '/api/changeParent/' + layer.save, { parent_id: targetGroup.save });
  targetGroup.expanded = true;
}

function extractLayer(items, id) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id == id) return items.splice(i, 1)[0];
    if (items[i].children?.length) {
      const found = extractLayer(items[i].children, id);
      if (found) return found;
    }
  }
  return null;
}

function showMessage(msg, type) {
  $toast.open({ message: msg, type: type, duration: 4000 });
}
</script>
