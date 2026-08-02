<template>
  <Transition name="modal">
    <div v-if="dialog" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[95vh] text-xs" dir="rtl">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b flex-shrink-0">
        <h2 class="text-base font-semibold flex items-center gap-2">
          <i class="fas fa-print text-gray-600"></i>
          کروکی وضعیت موجود
        </h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700 text-lg leading-none">✕</button>
      </div>
      
      <!-- Body -->
      <div class="overflow-y-auto px-5 py-4 flex-1 min-h-0">
        <!-- انتخاب پلی‌گان/خط -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">انتخاب ترسیم (پلی‌گان / خط)</label>
            <select v-model="selectedPinId" class="w-full border rounded px-2 py-1.5">
              <option v-if="!eligiblePins.length" value="">— ترسیمی یافت نشد —</option>
              <option v-for="p in eligiblePins" :key="p.id" :value="p.id">
                {{ p.name || 'بدون نام' }} ({{ p.shape.type === 'polygon' ? 'پلی‌گان' : 'خط' }} - {{ p.shape.positions.length }} نقطه)
              </option>
            </select>
          </div>
          <div class="flex items-end">
            <button @click="generate" :disabled="!selectedPin || generating"
                    class="btn btn-primary w-full py-1.5 disabled:opacity-50">
              <i class="fas fa-sync-alt ml-1" :class="generating ? 'fa-spin' : ''"></i>
              تولید کروکی
            </button>
          </div>
        </div>

        <!-- اطلاعات فرم (اختیاری) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 border rounded p-3">
          <div>
            <label class="block mb-1 font-medium">عنوان نقشه</label>
            <input v-model="form.title" type="text" class="w-full border rounded px-2 py-1"
                   placeholder="پلان وضعیت موجود"/>
          </div>
          <div>
            <label class="block mb-1 font-medium">کارفرما</label>
            <input v-model="form.client" type="text" class="w-full border rounded px-2 py-1"/>
          </div>
          <div>
            <label class="block mb-1 font-medium">نشانی ملک</label>
            <input v-model="form.address" type="text" class="w-full border rounded px-2 py-1"/>
          </div>
          <div>
            <label class="block mb-1 font-medium">تاریخ برداشت</label>
            <input 
              v-model="form.date" 
              type="text" 
              class="w-full border rounded px-2 py-1 text-center"
              placeholder="1403/01/01"
              dir="ltr"
              @input="form.date = form.date.replace(/[^\d/]/g, '')"
            />
          </div>
        </div>

        <div v-if="errorMsg" class="mb-3 text-red-600">{{ errorMsg }}</div>

        <!-- پیش‌نمایش -->
        <div v-if="ready" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border rounded p-2">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">تصویر نقشه</span>
                <button @click="downloadImage(mapImage, 'map.png')" class="text-gray-500 hover:text-gray-700" title="دانلود">
                  <i class="fas fa-download"></i>
                </button>
              </div>
              <img :src="mapImage" class="w-full border rounded" alt="تصویر نقشه"/>
            </div>
            <div class="border rounded p-2">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">کروکی وضعیت موجود</span>
                <button @click="downloadCanvas" class="text-gray-500 hover:text-gray-700" title="دانلود">
                  <i class="fas fa-download"></i>
                </button>
              </div>
              <canvas ref="sketchCanvasRef" width="700" height="700" class="w-full border rounded bg-white"></canvas>
            </div>
          </div>
          
          <!-- جدول مختصات UTM -->
          <div class="border rounded p-3">
            <div class="font-medium mb-2">مختصات UTM</div>
            <table class="w-full text-[11px] border-collapse">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border px-2 py-1">شماره نقطه</th>
                  <th class="border px-2 py-1">Easting</th>
                  <th class="border px-2 py-1">Northing</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in utmPoints" :key="i">
                  <td class="border px-2 py-1 text-center">{{ i + 1 }}</td>
                  <td class="border px-2 py-1 text-center">{{ p.x.toFixed(2) }}</td>
                  <td class="border px-2 py-1 text-center">{{ p.y.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="mt-2 text-gray-600">مساحت کل: {{ areaM2.toFixed(2) }} متر مربع</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-5 py-3 border-t flex-shrink-0">
        <button @click="close" class="px-4 py-1.5 border rounded">بستن</button>
        <button @click="doPrint" :disabled="!ready" class="btn btn-primary px-4 py-1.5 disabled:opacity-50">
          <i class="fas fa-print ml-1"></i>
          چاپ
        </button>
      </div>
    </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import mapboxgl from 'mapbox-gl'
import proj4 from 'proj4'

const props = defineProps({
  map: { type: Object, required: true },
  pins: { type: Object, required: true }
})

const dialog = ref(false)
const generating = ref(false)
const ready = ref(false)
const errorMsg = ref('')

const selectedPinId = ref('')
const mapImage = ref('')
const utmPoints = ref([])
const areaM2 = ref(0)

const sketchCanvasRef = ref(null)

/* -------------------- تبدیل تاریخ میلادی به شمسی -------------------- */
function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  const gy2 = (gm > 2) ? (gy + 1) : gy
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1]
  let jy = -1595 + (33 * Math.floor(days / 12053))
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30))
  return { jy, jm, jd }
}

function getTodayJalali() {
  const d = new Date()
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const pad = n => String(n).padStart(2, '0')
  return `${jy}/${pad(jm)}/${pad(jd)}`
}

const form = reactive({
  title: 'پلان وضعیت موجود',
  client: '',
  address: '',
  date: getTodayJalali() // تاریخ پیش‌فرض شمسی
})

/* -------------------- لیست پلی‌گان‌ها / خط‌های قابل استفاده -------------------- */
function flattenPins(list) {
  const out = []
  for (const p of list || []) {
    if (p.type === 'group' && Array.isArray(p.children)) {
      out.push(...flattenPins(p.children))
    } else {
      out.push(p)
    }
  }
  return out
}

const eligiblePins = computed(() =>
  flattenPins(props.pins).filter(
    p => p.type === 'draw' &&
      p.shape &&
      ['polygon', 'polyline'].includes(p.shape.type) &&
      Array.isArray(p.shape.positions) &&
      p.shape.positions.length >= 2
  )
)

const selectedPin = computed(() =>
  eligiblePins.value.find(p => p.id === selectedPinId.value) || null
)

/* -------------------- باز / بسته کردن دیالوگ -------------------- */
function open(pin) {
  errorMsg.value = ''
  ready.value = false
  mapImage.value = ''
  utmPoints.value = []
  dialog.value = true

  if (pin && pin.id) {
    selectedPinId.value = pin.id
  } else if (!selectedPinId.value || !eligiblePins.value.find(p => p.id === selectedPinId.value)) {
    selectedPinId.value = eligiblePins.value.length ? eligiblePins.value[eligiblePins.value.length - 1].id : ''
  }
}

function close() {
  dialog.value = false
}

/* -------------------- تبدیل به UTM -------------------- */
function toUTM(positions) {
  if (!positions.length) return []
  const lonAvg = positions.reduce((s, p) => s + p.lon, 0) / positions.length
  const zone = Math.floor((lonAvg + 180) / 6) + 1
  const projStr = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`
  return positions.map(p => {
    const [x, y] = proj4('EPSG:4326', projStr, [p.lon, p.lat])
    return { x, y }
  })
}

function computeArea(pts) {
  if (pts.length < 3) return 0
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum / 2)
}

/* -------------------- گرفتن تصویر از نقشه -------------------- */
async function captureMapImage(positions) {
  const bounds = new mapboxgl.LngLatBounds()
  positions.forEach(p => bounds.extend([p.lon, p.lat]))

  const allLayers = props.map.getStyle().layers || []
  
  const layerStates = new Map()
  for (const layer of allLayers) {
    try {
      const visibility = props.map.getLayoutProperty(layer.id, 'visibility')
      layerStates.set(layer.id, visibility)
    } catch (e) {
      layerStates.set(layer.id, 'visible')
    }
  }

  const baseLayerIds = new Set()
  for (const layer of allLayers) {
    if (layer.id.startsWith('basemap-') || 
        layer.id === 'satellite' || 
        layer.id === 'local-tile-layer' ||
        layer.id === 'local-tile') {
      baseLayerIds.add(layer.id)
    }
  }

  const activePinIds = new Set()
  for (const pin of flattenPins(props.pins)) {
    if (pin.shape && pin.shape.show !== false) {
      activePinIds.add(pin.id)
    }
  }

  for (const layer of allLayers) {
    if (!baseLayerIds.has(layer.id)) {
      try { props.map.setLayoutProperty(layer.id, 'visibility', 'none') } catch (e) {}
    }
  }

  for (const layer of allLayers) {
    if (!baseLayerIds.has(layer.id)) {
      for (const pinId of activePinIds) {
        if (layer.id.includes(pinId)) {
          try { props.map.setLayoutProperty(layer.id, 'visibility', 'visible') } catch (e) {}
          break
        }
      }
    }
  }

  await new Promise(resolve => {
    props.map.fitBounds(bounds, { padding: 60, duration: 0 })
    props.map.once('idle', resolve)
    setTimeout(resolve, 1500)
  })

  props.map.triggerRepaint()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  await new Promise(r => setTimeout(r, 200))

  const dataUrl = props.map.getCanvas().toDataURL('image/png')

  for (const [layerId, visibility] of layerStates) {
    try { props.map.setLayoutProperty(layerId, 'visibility', visibility) } catch (e) {}
  }

  return dataUrl
}

/* -------------------- رسم کروکی روی کانواس سفید -------------------- */
function niceScaleLength(span) {
  const target = span / 5
  if (!isFinite(target) || target <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(target)))
  const candidates = [1, 2, 5, 10].map(m => m * pow)
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best
  )
}

function drawSketch() {
  const canvas = sketchCanvasRef.value
  if (!canvas) return
  const W = canvas.width
  const H = canvas.height
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const pts = utmPoints.value
  if (!pts.length) return

  const pad = 70
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 0.001)
  const spanY = Math.max(maxY - minY, 0.001)
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY)

  const toCanvas = (p) => ({
    x: pad + (p.x - minX) * scale,
    y: H - (pad + (p.y - minY) * scale)
  })

  const cpts = pts.map(toCanvas)
  const cx = cpts.reduce((s, p) => s + p.x, 0) / cpts.length
  const cy = cpts.reduce((s, p) => s + p.y, 0) / cpts.length

  const isClosed = selectedPin.value?.shape?.type === 'polygon'

  ctx.beginPath()
  cpts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  if (isClosed) ctx.closePath()
  if (isClosed) {
    ctx.fillStyle = 'rgba(122, 31, 31, 0.05)'
    ctx.fill()
  }
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#7a1f1f'
  ctx.stroke()

  const edgeCount = isClosed ? cpts.length : cpts.length - 1
  for (let i = 0; i < edgeCount; i++) {
    const a = cpts[i]
    const b = cpts[(i + 1) % cpts.length]
    const aUtm = pts[i]
    const bUtm = pts[(i + 1) % pts.length]
    const dx = bUtm.x - aUtm.x
    const dy = bUtm.y - aUtm.y
    const lenM = Math.sqrt(dx * dx + dy * dy)

    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2

    let nx = -(b.y - a.y)
    let ny = (b.x - a.x)
    const nlen = Math.sqrt(nx * nx + ny * ny) || 1
    nx /= nlen
    ny /= nlen

    const toCx = mx - cx, toCy = my - cy
    if (nx * toCx + ny * toCy < 0) { nx = -nx; ny = -ny }

    const labelX = mx + nx * 22
    const labelY = my + ny * 22

    let angle = Math.atan2(b.y - a.y, b.x - a.x)
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI

    ctx.save()
    ctx.translate(labelX, labelY)
    ctx.rotate(angle)
    ctx.font = '600 15px Vazirmatn, Tahoma, sans-serif'
    ctx.fillStyle = '#222'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(lenM.toFixed(2), 0, 0)
    ctx.restore()
  }

  cpts.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#7a1f1f'
    ctx.fill()

    const toCx = p.x - cx, toCy = p.y - cy
    const dlen = Math.sqrt(toCx * toCx + toCy * toCy) || 1
    const lx = p.x + (toCx / dlen) * 24
    const ly = p.y + (toCy / dlen) * 24

    ctx.font = '700 17px Vazirmatn, Tahoma, sans-serif'
    ctx.fillStyle = '#111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), lx, ly)
  })

  const nax = W - 50, nay = 50
  ctx.save()
  ctx.strokeStyle = '#333'
  ctx.fillStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(nax, nay + 22); ctx.lineTo(nax, nay - 14); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(nax, nay - 20); ctx.lineTo(nax - 6, nay - 10); ctx.lineTo(nax + 6, nay - 10)
  ctx.closePath(); ctx.fill()
  ctx.font = '700 13px Tahoma'
  ctx.textAlign = 'center'
  ctx.fillText('N', nax, nay + 36)
  ctx.restore()

  const barM = niceScaleLength(spanX)
  const barPx = barM * scale
  const bx0 = pad, by0 = H - 30
  ctx.save()
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx0 + barPx, by0); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bx0, by0 - 5); ctx.lineTo(bx0, by0 + 5)
  ctx.moveTo(bx0 + barPx, by0 - 5); ctx.lineTo(bx0 + barPx, by0 + 5)
  ctx.stroke()
  ctx.font = '12px Tahoma'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#333'
  ctx.fillText(barM + ' m', bx0 + barPx / 2, by0 - 10)
  ctx.restore()
}

/* -------------------- تولید (map screenshot + کروکی) -------------------- */
async function generate() {
  errorMsg.value = ''
  ready.value = false

  const pin = selectedPin.value
  if (!pin) {
    errorMsg.value = 'یک ترسیم (پلی‌گان یا خط) را انتخاب کنید.'
    return
  }

  const positions = pin.shape.positions
  if (!positions || positions.length < 2) {
    errorMsg.value = 'حداقل ۲ نقطه لازم است.'
    return
  }

  generating.value = true
  try {
    utmPoints.value = toUTM(positions)
    areaM2.value = computeArea(utmPoints.value)
    mapImage.value = await captureMapImage(positions)

    ready.value = true
    await nextTick()
    drawSketch()
  } catch (err) {
    console.error('خطا در تولید کروکی:', err)
    errorMsg.value = 'خطا در تولید کروکی. کنسول را برای جزئیات بررسی کنید.'
  } finally {
    generating.value = false
  }
}

/* -------------------- دانلود تصاویر -------------------- */
function downloadImage(dataUrl, filename) {
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function downloadCanvas() {
  const canvas = sketchCanvasRef.value
  if (!canvas) return
  downloadImage(canvas.toDataURL('image/png'), 'kroki.png')
}

/* -------------------- چاپ -------------------- */
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]))
}

const printCss = `
* { box-sizing: border-box; }
body { font-family: Tahoma, 'Vazirmatn', sans-serif; margin: 0; padding: 0; color: #222; }
.sheet { max-width: 900px; margin: 0 auto; padding: 24px; }
.head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
.head-title { font-size: 20px; font-weight: 700; }
.head-sub { font-size: 12px; color: #555; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
table.info-table td { border: 1px solid #bbb; padding: 6px 8px; }
table.info-table td:nth-child(1), table.info-table td:nth-child(3) { background: #f3f3f3; font-weight: 600; width: 15%; }
table.utm-table th, table.utm-table td { border: 1px solid #bbb; padding: 6px 8px; text-align: center; }
table.utm-table thead th { background: #f3f3f3; }
.images { display: flex; gap: 16px; margin-bottom: 16px; page-break-inside: avoid; }
figure { flex: 1; margin: 0; border: 1px solid #bbb; padding: 6px; text-align: center; }
figure img { width: 100%; height: auto; display: block; }
figcaption { font-size: 12px; color: #444; margin-top: 6px; font-weight: 600; }
.disclaimer { font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
@page { size: A4 portrait; margin: 12mm; }
@media print {
  .sheet { padding: 0; }
}
`

function buildPrintHtml() {
  const sketchImg = sketchCanvasRef.value?.toDataURL('image/png') || ''

  const rows = utmPoints.value.map((p, i) => `
    <tr><td>${i + 1}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td></tr>
  `).join('')

  return `
    <div class="sheet">
      <div class="head">
        <div class="head-title">${escapeHtml(form.title) || 'کروکی وضعیت موجود'}</div>
        <div class="head-sub">تاریخ برداشت: ${escapeHtml(form.date)}</div>
      </div>

      <table class="info-table">
        <tr>
          <td>کارفرما</td><td>${escapeHtml(form.client)}</td>
          <td>نشانی ملک</td><td>${escapeHtml(form.address)}</td>
        </tr>
        <tr>
          <td>سیستم مختصات</td><td>WGS 1984 / UTM</td>
          <td>مساحت کل</td><td>${areaM2.value.toFixed(2)} متر مربع</td>
        </tr>
      </table>

      <div class="images">
        <figure>
          <img src="${mapImage.value}" />
          <figcaption>تصویر نقشه</figcaption>
        </figure>
        <figure>
          <img src="${sketchImg}" />
          <figcaption>کروکی وضعیت موجود</figcaption>
        </figure>
      </div>

      <table class="utm-table">
        <thead>
          <tr><th colspan="3">مختصات UTM</th></tr>
          <tr><th>شماره نقطه</th><th>Easting</th><th>Northing</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="disclaimer">
        کلیه حدود بر اساس اظهارات مالک برداشت شده است و نقشه‌بردار هیچ مسئولیتی در قبال تعدی به املاک مجاور و حریم‌های موجود ندارد.
      </div>
    </div>
  `
}

function doPrint() {
  if (!ready.value) return

  const html = buildPrintHtml()

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(form.title) || 'کروکی'}</title>
  <style>${printCss}</style>
</head>
<body>${html}</body>
</html>`)
  doc.close()

  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('خطا در چاپ:', e)
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 1000)
  }, 450)
}

defineExpose({ open })
</script>