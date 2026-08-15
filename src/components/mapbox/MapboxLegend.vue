<template>
  <div class="mapbox-legend border border-[var(--border)] bg-white rounded-lg shadow-lg">
    <div
      class="legend-header flex items-center justify-between px-3 py-2 cursor-pointer select-none rounded-t-lg hover:bg-gray-50"
      @click="expanded = !expanded"
    >
      <span class="text-xs font-semibold flex items-center gap-1.5 text-gray-800">
        <i class="fas fa-layer-group text-accent"></i>
        راهنمای نقشه
        <span class="text-[10px] font-normal text-gray-500">({{ activeLayers.length }})</span>
      </span>
      <i
        class="fas text-xs text-gray-400 transition-transform"
        :class="expanded ? 'fa-chevron-down' : 'fa-chevron-left'"
      ></i>
    </div>

    <div v-if="expanded" class="legend-body max-h-64 overflow-y-auto px-2 pb-2 pt-1 space-y-0.5">
      <p v-if="!activeLayers.length" class="text-[11px] text-gray-400 text-center py-2">
        لایه فعالی وجود ندارد
      </p>
      <div
        v-for="layer in activeLayers"
        :key="layer.pin.id"
        class="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-gray-100"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span
            class="shrink-0 inline-block w-3.5 h-3.5 rounded-full border border-gray-300 shadow-sm"
            :style="{ background: layer.color }"
          ></span>
          <span class="text-xs text-gray-800 truncate">{{ layer.pin.name || 'بدون نام' }}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <input
            type="color"
            class="legend-color-input shrink-0 cursor-pointer"
            :value="layer.color"
            @input="changeColor(layer, $event.target.value)"
            title="تغییر رنگ ترسیم"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, toRaw } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import { useToast } from 'vue-toast-notification'
import { pointIcon, ensurePointSymbolImages } from '../../utils/drawStyle'

const authStore = useAuthStore()
const $toast = useToast()
const SERVER = import.meta.env.VITE_SERVER

const props = defineProps({
  pins: { type: Object, required: true },
  map: { type: Object, required: true },
  initialExpanded: { type: Boolean, default: true },
})

const expanded = ref(props.initialExpanded)

function flatten(list) {
  const out = []
  for (const p of list || []) {
    if (p && (p.type === 'group' || p.type === 'folder') && Array.isArray(p.children)) {
      out.push(...flatten(p.children))
    } else if (p) {
      out.push(p)
    }
  }
  return out
}

function pinColor(pin) {
  const s = pin.shape
  if (!s) return '#ff0000'
  if (s.type === 'circle') return s.fillColor || s.color || '#0000ff'
  return s.color || '#ff0000'
}

const activeLayers = computed(() => {
  const out = []
  for (const pin of flatten(props.pins)) {
    if (pin.type !== 'draw' && pin.type !== 'file') continue
    if (pin.shape && pin.shape.show === false) continue
    out.push({ pin, color: pinColor(pin) })
  }
  return out
})

function setPaint(layerId, prop, value) {
  const map = props.map
  if (!map || !map.getLayer(layerId)) return
  try {
    map.setPaintProperty(layerId, prop, value)
  } catch (e) {}
}

let persistTimer = null
function changeColor(layer, color) {
  if (!color) return
  const pin = layer.pin
  const shape = pin.shape
  if (!shape) return

  shape.color = color
  const map = props.map
  if (!map) return

  const sid = (shape._sourceIds && shape._sourceIds[0]) || 'draw-pin-' + pin.id

  if (pin.type === 'file') {
    setPaint(sid + '-fill', 'fill-color', color)
    setPaint(sid + '-line', 'line-color', color)
    setPaint(sid + '-point', 'circle-color', color)
    return
  }

  if (shape.type === 'multi_point') {
    try {
      shape.positions.forEach((p) => (p.color = color))
      const features = (shape.positions || []).map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: {
          color,
          icon: pointIcon(shape.symbol || p.symbol),
        },
      }))
      map.getSource(sid)?.setData({ type: 'FeatureCollection', features })
      const layer = map.getLayer(sid + '-points')
      if (layer?.type === 'symbol') {
        ensurePointSymbolImages(map)
        setPaint(sid + '-points', 'icon-color', ['get', 'color'])
      } else {
        setPaint(sid + '-points', 'circle-color', ['get', 'color'])
      }
    } catch (e) {}
    return
  }

  if (shape.type === 'polygon') {
    setPaint(sid + '-fill', 'fill-color', color)
    setPaint(sid + '-line', 'line-color', color)
  } else if (shape.type === 'polyline') {
    setPaint(sid + '-line', 'line-color', color)
  } else if (shape.type === 'point') {
    setPaint(sid + '-point', 'circle-color', color)
  } else if (shape.type === 'circle') {
    shape.fillColor = color
    setPaint(sid + '-fill', 'fill-color', color)
    setPaint(sid + '-line', 'line-color', color)
  }

  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => persistColor(pin), 600)
}

async function persistColor(pin) {
  if (pin.type !== 'draw' || !authStore.user) return
  if (!pin.shape) return
  const fd = new FormData()
  fd.append('type', pin.type)
  fd.append('name', pin.name)
  fd.append('obj_id', pin.id)
  fd.append('parent_id', pin.parent_id ?? -1)
  fd.append('content', JSON.stringify(toRaw(pin.shape)))
  try {
    if (pin.save != null && Number(pin.save) > 0) {
      await axios.put(SERVER + '/api/save/myWork/' + pin.save, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else {
      const res = await axios.post(SERVER + '/api/Save/myWork/' + authStore.user.id, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.id) pin.save = res.data.id
    }
    $toast?.success?.('رنگ ترسیم ذخیره شد')
  } catch (e) {
    console.error('خطا در ذخیره رنگ:', e)
  }
}
</script>

<style scoped>
.legend-color-input {
  width: 26px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  background: none;
}
</style>