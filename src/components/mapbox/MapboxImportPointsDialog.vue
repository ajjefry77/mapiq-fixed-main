<template>
  <Transition name="modal">
    <div v-if="dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-3xl text-xs flex flex-col max-h-[90vh]" dir="ltr">

      <!-- Header (ثابت) -->
      <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0" dir="rtl">
        <h2 class="text-base font-semibold">وارد کردن فایل نقاط (CSV / TXT)</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700 text-lg leading-none">✕</button>
      </div>

      <!-- بدنه قابل اسکرول -->
      <div class="overflow-y-auto px-5 py-3 flex-1 min-h-0">

      <div class="grid grid-cols-2 gap-4 mb-3">
        <!-- Coordinate System -->
        <div>
          <label class="block mb-1 font-medium">Coordinate System</label>
          <select v-model="settings.coordSystem" class="w-full border rounded px-2 py-1">
            <option value="WGS84">WGS 84 (EPSG::4326)</option>
            <option value="UTM">UTM (تشخیص خودکار Zone)</option>
          </select>
        </div>

        <!-- Rotation angles -->
        <div>
          <label class="block mb-1 font-medium">Rotation angles</label>
          <select v-model="settings.rotationOrder" class="w-full border rounded px-2 py-1">
            <option value="ypr">Yaw, Pitch, Roll</option>
            <option value="opk">Omega, Phi, Kappa</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-3 items-end">
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="settings.ignoreLabels" class="accent-green-600"/>
          Ignore labels
        </label>

        <div>
          <label class="block mb-1 font-medium">Threshold (m):</label>
          <input type="number" v-model.number="settings.threshold" step="0.01"
                 class="w-full border rounded px-2 py-1"/>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">

        <!-- Delimiter -->
        <div class="border rounded p-3">
          <div class="font-medium mb-2">Delimiter</div>

          <label class="flex items-center gap-2 mb-1">
            <input type="radio" value="tab" v-model="settings.delimiter" class="accent-green-600"/>
            Tab
          </label>
          <label class="flex items-center gap-2 mb-1">
            <input type="radio" value="semicolon" v-model="settings.delimiter" class="accent-green-600"/>
            Semicolon
          </label>
          <label class="flex items-center gap-2 mb-1">
            <input type="radio" value="comma" v-model="settings.delimiter" class="accent-green-600"/>
            Comma
          </label>
          <label class="flex items-center gap-2 mb-1">
            <input type="radio" value="space" v-model="settings.delimiter" class="accent-green-600"/>
            Space
          </label>
          <label class="flex items-center gap-2 mb-2">
            <input type="radio" value="other" v-model="settings.delimiter" class="accent-green-600"/>
            Other:
            <input type="text" v-model="settings.otherDelimiter" maxlength="3"
                   :disabled="settings.delimiter !== 'other'"
                   class="border rounded px-1 py-0.5 w-14 disabled:bg-gray-100"/>
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="settings.combineConsecutive" class="accent-green-600"/>
            Combine consecutive delimiters
          </label>
        </div>

        <!-- Columns -->
        <div class="border rounded p-3">
          <div class="font-medium mb-2">Columns</div>

          <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-1 items-center">

            <span>Label:</span>
            <input type="number" min="0" v-model.number="cols.label" class="border rounded w-12 px-1 py-0.5"/>
            <label class="flex items-center gap-1 col-span-2">
              <input type="checkbox" v-model="cols.labelAccuracy" class="accent-green-600"/>
              Accuracy
            </label>

            <span>Longitude:</span>
            <input type="number" min="0" v-model.number="cols.longitude" class="border rounded w-12 px-1 py-0.5"/>
            <input type="number" min="0" v-model.number="cols.longitudeAcc" :disabled="!cols.labelAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <span>Latitude:</span>
            <input type="number" min="0" v-model.number="cols.latitude" class="border rounded w-12 px-1 py-0.5"/>
            <input type="number" min="0" v-model.number="cols.latitudeAcc" :disabled="!cols.labelAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <span>Altitude:</span>
            <input type="number" min="0" v-model.number="cols.altitude" class="border rounded w-12 px-1 py-0.5"/>
            <input type="number" min="0" v-model.number="cols.altitudeAcc" :disabled="!cols.labelAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <label class="flex items-center gap-1">
              <input type="checkbox" v-model="cols.rotationEnabled" class="accent-green-600"/>
              Rotation:
            </label>
            <span></span>
            <label class="flex items-center gap-1 col-span-2">
              <input type="checkbox" v-model="cols.rotationAccuracy" :disabled="!cols.rotationEnabled"
                     class="accent-green-600"/>
              Accuracy
            </label>

            <span>Yaw:</span>
            <input type="number" min="0" v-model.number="cols.yaw" :disabled="!cols.rotationEnabled"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <input type="number" min="0" v-model.number="cols.yawAcc"
                   :disabled="!cols.rotationEnabled || !cols.rotationAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <span>Pitch:</span>
            <input type="number" min="0" v-model.number="cols.pitch" :disabled="!cols.rotationEnabled"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <input type="number" min="0" v-model.number="cols.pitchAcc"
                   :disabled="!cols.rotationEnabled || !cols.rotationAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <span>Roll:</span>
            <input type="number" min="0" v-model.number="cols.roll" :disabled="!cols.rotationEnabled"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <input type="number" min="0" v-model.number="cols.rollAcc"
                   :disabled="!cols.rotationEnabled || !cols.rotationAccuracy"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>

            <label class="flex items-center gap-1 col-span-2">
              <input type="checkbox" v-model="cols.enabledFlagOn" class="accent-green-600"/>
              Enabled flag:
            </label>
            <input type="number" min="0" v-model.number="cols.enabledFlag" :disabled="!cols.enabledFlagOn"
                   class="border rounded w-12 px-1 py-0.5 disabled:bg-gray-100"/>
            <span></span>
          </div>
        </div>
      </div>

      <!-- Start row + items type -->
      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center gap-2">
          <span>Start import at row:</span>
          <input type="number" min="1" v-model.number="settings.startRow" class="border rounded w-16 px-1 py-0.5"/>
        </div>

        <div class="flex items-center gap-2">
          <span>Items:</span>
          <select v-model="settings.itemsType" class="border rounded px-2 py-1">
            <option value="markers">Markers</option>
          </select>
        </div>
      </div>

      <!-- Field palette: drag a field onto a table column header to assign it -->
      <div class="mt-3" dir="rtl">
        <div class="font-medium mb-1">فیلدها (بکشید و روی ستون مورد نظر در جدول رها کنید):</div>
        <div class="flex flex-wrap gap-2 p-2 border rounded border-dashed"
             @dragover="onPaletteDragOver" @drop="onPaletteDrop">
          <span v-for="f in fieldDefs" :key="f.key"
                draggable="true"
                @dragstart="onChipDragStart($event, f.key)"
                class="px-2 py-1 rounded cursor-move text-white text-[11px] select-none"
                :class="cols[f.key] ? 'bg-green-600' : 'bg-gray-400'">
            {{ f.title }}<span v-if="cols[f.key]"> (#{{ cols[f.key] }})</span>
          </span>
        </div>
      </div>

      <!-- Preview -->
      <div class="mt-3">
        <div class="font-medium mb-1">First 20 lines preview:</div>
        <div class="border rounded overflow-auto" style="max-height: 220px;">
          <table class="w-full text-[11px] border-collapse">
            <thead class="sticky top-0 bg-gray-200">
              <tr>
                <th class="border px-1 py-0.5 bg-gray-400 text-white w-8">#</th>
                <th v-for="c in maxCols" :key="c"
                    class="border px-1 py-0.5 select-none"
                    :class="headerClass(c)"
                    :draggable="!!fieldAtColumn(c)"
                    @dragstart="onHeaderDragStart($event, c)"
                    @dragover="onHeaderDragOver"
                    @drop="onHeaderDrop($event, c)">
                  {{ headerLabel(c) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rIdx) in previewRows" :key="rIdx"
                  :class="rIdx + 1 < settings.startRow ? 'text-gray-400' : ''">
                <td class="border px-1 py-0.5 bg-gray-100 text-center">{{ rIdx + 1 }}</td>
                <td v-for="c in maxCols" :key="c" class="border px-1 py-0.5 whitespace-nowrap">
                  {{ row[c-1] ?? '' }}
                </td>
              </tr>
              <tr v-if="!previewRows.length">
                <td class="border px-2 py-2 text-center text-gray-400" :colspan="maxCols + 1">
                  فایلی انتخاب نشده است
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="errorMsg" class="mt-2 text-red-600">{{ errorMsg }}</div>

      </div>
      <!-- پایان بدنه قابل اسکرول -->

      <!-- Footer (ثابت) -->
      <div class="flex justify-end gap-2 px-5 py-3 border-t flex-shrink-0" dir="rtl">
        <button @click="close" class="px-4 py-1.5 border rounded">Cancel</button>
        <button @click="doImport" class="btn btn-primary px-4 py-1.5">OK</button>
      </div>

    </div>
    </div>
  </Transition>

  <Loading :active="loading" />
</template>

<script setup>
import { ref, reactive, computed, inject } from 'vue'
import mapboxgl from 'mapbox-gl'
import Loading from '../Loading.vue'
import { registerLayersForSource } from '../../utils/layerOrder'

const props = defineProps({
  map: { type: Object, required: true },
  pins: { type: Object, required: true }
})

const emit = defineEmits(['imported'])

const SelectGroup = inject('SelectGroup', null)

const dialog = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const fileName = ref('')
const rawText = ref('')

const settings = reactive({
  coordSystem: 'WGS84',
  rotationOrder: 'ypr',
  ignoreLabels: false,
  threshold: 0.1,
  delimiter: 'tab',
  otherDelimiter: '',
  combineConsecutive: false,
  startRow: 2,
  itemsType: 'markers'
})

const cols = reactive({
  label: 1,
  labelAccuracy: false,

  longitude: 3,
  longitudeAcc: 8,

  latitude: 2,
  latitudeAcc: 8,

  altitude: 4,
  altitudeAcc: 8,

  rotationEnabled: false,
  rotationAccuracy: false,

  yaw: 7,
  yawAcc: 5,

  pitch: 6,
  pitchAcc: 6,

  roll: 5,
  rollAcc: 7,

  enabledFlagOn: false,
  enabledFlag: 10
})

/* -------------------- باز / بسته کردن دیالوگ -------------------- */

async function open(file) {
  errorMsg.value = ''
  fileName.value = file.name
  const lower = file.name.toLowerCase()

  // پیش‌فرض جداکننده بر اساس نوع فایل
  settings.delimiter = lower.endsWith('.csv') ? 'comma' : 'tab'

  rawText.value = await file.text()
  autoDetect()
  dialog.value = true
}

function close() {
  dialog.value = false
}

/* -------------------- تشخیص جداکننده و ستون‌ها -------------------- */

const delimiterChar = computed(() => {
  switch (settings.delimiter) {
    case 'tab': return '\t'
    case 'semicolon': return ';'
    case 'comma': return ','
    case 'space': return ' '
    case 'other': return settings.otherDelimiter || ','
    default: return ','
  }
})

function splitLine(line) {
  let parts = line.split(delimiterChar.value)
  if (settings.combineConsecutive) {
    parts = parts.filter(p => p !== '')
  }
  return parts.map(p => p.trim())
}

const allLines = computed(() => {
  if (!rawText.value) return []
  return rawText.value
      .split(/\r\n|\r|\n/)
      .filter(l => l.length > 0)
})

const parsedLines = computed(() => allLines.value.map(splitLine))

const previewRows = computed(() => parsedLines.value.slice(0, 20))

const maxCols = computed(() => {
  let max = 4
  previewRows.value.forEach(r => { if (r.length > max) max = r.length })
  return Math.min(max, 12)
})

/* -------------------- تخصیص فیلدها با درگ و دراپ (مثل Metashape) -------------------- */

const fieldDefs = computed(() => {
  const defs = [
    { key: 'label', title: 'Label' },
    { key: 'longitude', title: 'Longitude' },
    { key: 'latitude', title: 'Latitude' },
    { key: 'altitude', title: 'Altitude' }
  ]
  if (cols.rotationEnabled) {
    defs.push({ key: 'yaw', title: 'Yaw' })
    defs.push({ key: 'pitch', title: 'Pitch' })
    defs.push({ key: 'roll', title: 'Roll' })
  }
  if (cols.enabledFlagOn) {
    defs.push({ key: 'enabledFlag', title: 'Enabled flag' })
  }
  return defs
})

function fieldAtColumn(colIndex) {
  if (!colIndex) return null
  return fieldDefs.value.find(f => cols[f.key] === colIndex) || null
}

function headerLabel(colIndex) {
  return fieldAtColumn(colIndex)?.title || ''
}

function headerClass(colIndex) {
  return fieldAtColumn(colIndex)
      ? 'bg-gray-400 text-white cursor-move'
      : 'bg-gray-100 text-gray-400'
}

// جابه‌جایی یک فیلد به ستون جدید؛ اگر ستون مقصد قبلاً فیلد دیگری داشت، جای دو فیلد عوض می‌شود
function assignFieldToColumn(fieldKey, colIndex) {
  if (!fieldDefs.value.find(f => f.key === fieldKey)) return
  const prevCol = cols[fieldKey]
  if (prevCol === colIndex) return

  const occupying = fieldAtColumn(colIndex)
  if (occupying && occupying.key !== fieldKey) {
    cols[occupying.key] = prevCol || 0
  }
  cols[fieldKey] = colIndex
}

function onHeaderDragStart(e, colIndex) {
  const field = fieldAtColumn(colIndex)
  if (!field) { e.preventDefault(); return }
  e.dataTransfer.setData('text/plain', field.key)
  e.dataTransfer.effectAllowed = 'move'
}

function onHeaderDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

function onHeaderDrop(e, colIndex) {
  e.preventDefault()
  const key = e.dataTransfer.getData('text/plain')
  if (!key) return
  assignFieldToColumn(key, colIndex)
}

function onChipDragStart(e, key) {
  e.dataTransfer.setData('text/plain', key)
  e.dataTransfer.effectAllowed = 'move'
}

function onPaletteDragOver(e) {
  e.preventDefault()
}

// رها کردن یک فیلد روی پالت = لغو تخصیص آن (بدون ستون)
function onPaletteDrop(e) {
  e.preventDefault()
  const key = e.dataTransfer.getData('text/plain')
  if (!key) return
  if (fieldDefs.value.find(f => f.key === key)) {
    cols[key] = 0
  }
}

function autoDetect() {
  if (!parsedLines.value.length) return

  const firstRow = parsedLines.value[0]
  const lower = firstRow.map(c => (c || '').toLowerCase())

  const findCol = aliases => {
    const idx = lower.findIndex(c => aliases.includes(c))
    return idx >= 0 ? idx + 1 : null
  }

  const labelCol = findCol(['name', 'label', '#name'])
  const latCol = findCol(['lat', 'latitude'])
  const lonCol = findCol(['lon', 'lng', 'longitude'])
  const altCol = findCol(['alt', 'altitude', 'ell.h(m)', 'height', 'h'])

  // اگر ردیف اول شامل عنوان ستون بود، پرش به ردیف بعد و پر کردن مقادیر
  if (labelCol || latCol || lonCol || altCol) {
    if (labelCol) cols.label = labelCol
    if (latCol) cols.latitude = latCol
    if (lonCol) cols.longitude = lonCol
    if (altCol) cols.altitude = altCol
    settings.startRow = 2
  } else {
    settings.startRow = 1
  }
}

/* -------------------- ایمپورت نهایی -------------------- */

function doImport() {
  errorMsg.value = ''

  if (!parsedLines.value.length) {
    errorMsg.value = 'داده‌ای برای وارد کردن یافت نشد.'
    return
  }

  loading.value = true

  const sourceId = 'csv-' + crypto.randomUUID()
  const features = []
  const positions = []
  let skipped = 0

  const startIdx = Math.max(settings.startRow - 1, 0)

  for (let i = startIdx; i < parsedLines.value.length; i++) {
    const row = parsedLines.value[i]
    if (!row || !row.length) continue

    const rawLat = row[cols.latitude - 1]
    const rawLon = row[cols.longitude - 1]
    const rawAlt = cols.altitude ? row[cols.altitude - 1] : undefined
    const rawLabel = settings.ignoreLabels ? '' : (row[cols.label - 1] ?? '')

    const lat = Number(rawLat)
    const lon = Number(rawLon)
    const alt = rawAlt !== undefined && rawAlt !== '' ? Number(rawAlt) : 0

    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      skipped++
      continue
    }

    let rotation = null
    if (cols.rotationEnabled) {
      rotation = {
        yaw: Number(row[cols.yaw - 1]),
        pitch: Number(row[cols.pitch - 1]),
        roll: Number(row[cols.roll - 1])
      }
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        valid: true,
        label: rawLabel ? String(rawLabel) : '',
        alt
      }
    })

    positions.push({
      lon,
      lat,
      alt,
      label: rawLabel,
      rotation,
      color: '#00ff00',
      _row: row
    })
  }

  loading.value = false

  if (!features.length) {
    errorMsg.value = `هیچ نقطه معتبری یافت نشد. (${skipped} ردیف نامعتبر)`
    return
  }

  const geojson = { type: 'FeatureCollection', features }

  props.map.addSource(sourceId, { type: 'geojson', data: geojson })

  // نقاط
  props.map.addLayer({
    id: sourceId + '-points',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 6,
      'circle-color': '#00ff00',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  })

  // برچسب‌ها (فقط اگر Ignore labels تیک نخورده باشد)
  if (!settings.ignoreLabels) {
    props.map.addLayer({
      id: sourceId + '-labels',
      type: 'symbol',
      source: sourceId,
      filter: ['!=', ['get', 'label'], ''],
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1.2
      }
    })
  }

  registerLayersForSource(props.map, sourceId)

  const bounds = new mapboxgl.LngLatBounds()
  features.forEach(f => bounds.extend(f.geometry.coordinates))
  if (!bounds.isEmpty()) {
    props.map.fitBounds(bounds, { padding: 50, duration: 1500 })
  }

  const pin = {
    id: sourceId,
    name: fileName.value,
    shape: {
      type: 'multi_point',
      positions,
      width: 5,
      color: '#00ff00',
      show: true,
      _sourceIds: [sourceId]
    },
    date: new Date(),
    save: -1,
    type: 'draw'
  }

  if (SelectGroup && SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save ?? -1
    props.pins[SelectGroup.value].children.push(pin)
  } else {
    pin.parent_id = -1
    props.pins.push(pin)
  }

  emit('imported', { count: features.length, skipped, pin })
  dialog.value = false
}

defineExpose({ open })
</script>