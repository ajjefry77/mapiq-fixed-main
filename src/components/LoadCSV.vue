<template>
  <div>
    <!-- Dialog Backdrop -->
    <div  v-if="dialog"   class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" >
      <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">

        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">
            انتخاب ستون‌ها
          </h2>

          <button @click="dialog = false" class="text-gray-500 hover:text-gray-700" >
            ✕
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">

          <div>
            <label class="block mb-1 text-sm font-medium">
              Latitude
            </label>

            <select v-model="mapping.lat"  class="w-full border rounded px-3 py-2" >
              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium">
              Longitude
            </label>

            <select v-model="mapping.lng" class="w-full border rounded px-3 py-2" >
              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

        </div>

        <span class="block mt-8 text-sm">
          <input type="checkbox" v-model="validate" class="ml-2 accent-green-600"/>
          اعتبار سنجی نقاط از دستگاه GPS
        </span>
        <hr/>
        <div v-if="validate" class="grid grid-cols-2 gap-4 mt-8">

          <div>
            <label class="block mb-1 text-sm font-medium">
              HRMS
            </label>

            <select v-model="mapping.hrms" class="w-full border rounded px-3 py-2">
              <option value="">
                انتخاب نشود
              </option>

              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium">
              VRMS
            </label>

            <select v-model="mapping.vrms" class="w-full border rounded px-3 py-2">
              <option value="">
                انتخاب نشود
              </option>

              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium">
              PDOP
            </label>

            <select v-model="mapping.pdop" class="w-full border rounded px-3 py-2">
              <option value="">
                انتخاب نشود
              </option>

              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium">
              Age
            </label>

            <select v-model="mapping.age" class="w-full border rounded px-3 py-2">
              <option value="">
                انتخاب نشود
              </option>

              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium">
              STAT
            </label>

            <select v-model="mapping.stat" class="w-full border rounded px-3 py-2">
              <option value="">
                انتخاب نشود
              </option>

              <option v-for="col in columns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>

          <div class="block w-full h-3 bg-gray-200 rounded-full overflow-hidden" style="margin-top: 50px">
            <div
                class="h-full bg-blue-600"
                :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <div class="mt-4 p-3 bg-blue-50 rounded text-sm hidden">
          <div>PDOP : 0 تا 5</div>
          <div>Age : 0 تا 30</div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="dialog = false" class="px-4 py-2 border rounded" >
            انصراف
          </button>

          <button @click="renderPoints" class="btn btn-primary">
            تایید
          </button>
        </div>

      </div>
    </div>

  </div>
  <MultiPointsList   v-if="showPoint"  :pointList="pointList"  @close="showPoint = false"/>
  <Loading :active="loading" />
</template>

<script setup>
import {ref, reactive, onMounted, computed, watch, inject} from 'vue'
import Loading from '../components/Loading.vue'
import MultiPointsList from '../components/MultiPointsList.vue'
import proj4 from "proj4";

const props = defineProps({
  rows: {type: Array, required: true },
  pins: { type: Object, required: true },
  viewer: {type: Object, required: true
  }
})

const dialog = ref(false)
const invalidRows = ref([])
const pinName = ref('')
const loading = ref(false)
const validate = ref(false)
const progress = ref(0)
const pointList = ref([]);
const showPoint = ref(false);

const SelectGroup = inject('SelectGroup', null)

const mapping = reactive({
  lat: '',
  lng: '',
  hrms: '',
  vrms: '',
  pdop: '',
  age: '',
  stat:''
})

const columns = computed(() => {
  if (!props.rows.length) return []

  return Object.keys(props.rows[0])
})

onMounted(() => {
  autoDetectFields();
});

watch(() => props.rows,() => {
      autoDetectFields()
    },{ immediate: true }
)

function open(filename) {
  dialog.value = true;
  pinName.value = filename
}

function autoDetectFields() {

  const findField = aliases => columns.value.find(col => aliases.includes(col.toLowerCase())) || ''

  mapping.lat = findField(['lat','latitude'])
  mapping.lng = findField(['lng','lon','longitude'])
  mapping.hrms = findField(['hrms'])
  mapping.vrms = findField(['vrms'])
  mapping.pdop = findField(['pdop'])
  mapping.age = findField(['age'])
  mapping.stat = findField(['stat'])

}

function openDialog() {
  autoDetectFields()
  dialog.value = true
}

function validateRow(row) {
  const errors = []
  const lat = Number(row[mapping.lat])
  const lng = Number(row[mapping.lng])

  if ( Number.isNaN(lat) || lat < -90 || lat > 90 ) {
    errors.push('Latitude')
  }
  if (Number.isNaN(lng) || lng < -180 || lng > 180 ) {
    errors.push('Longitude')
  }
  if (mapping.hrms) {

    const hrms = Number(row[mapping.hrms])

    if (!Number.isNaN(hrms) && (hrms < 0.01 || hrms > 0.03)) {
      errors.push('HRMS')
    }
  }

  if (mapping.vrms) {

    const vrms = Number(row[mapping.vrms] )
    if (!Number.isNaN(vrms) && (vrms < 0.02 || vrms > 0.04)) {
      errors.push('VRMS')
    }
  }

  if (mapping.pdop) {

    const pdop = Number(row[mapping.pdop])

    if (!Number.isNaN(pdop) && (pdop < 0 || pdop > 3)) {
      errors.push('PDOP')
    }
  }

  if (mapping.age) {

    const age = Number(row[mapping.age] )
    if (!Number.isNaN(age) && (age < 0 || age > 10)) {
      errors.push('Age')
    }
  }

  if (mapping.stat) {

    const stat = row[mapping.stat]
    if (!Number.isNaN(stat) && !stat.includes('FIX_RTK_CORS')) {
      errors.push('stat')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }

}

function fakeProgress(duration = 3000) {
  return new Promise((resolve) => {
    const start = Date.now()

    const timer = setInterval(() => {
      const elapsed = Date.now() - start

      progress.value = Math.min( Math.floor((elapsed / duration) * 100), 100)

      if (progress.value === 100) {
        clearInterval(timer)
        resolve()
      }
    }, 16) // حدود 60fps
  })
}

async function renderPoints() {

  if (validate.value) await fakeProgress();

  dialog.value = false
  invalidRows.value = []
  const positionsCartesian = [];
  const positions = [];

  let id = crypto.randomUUID()
  const ds= new Cesium.CustomDataSource(id);
  props.viewer.dataSources.add(ds);


  props.rows.forEach((row, index) => {

    let result ={
      valid : true
    }
    if (validate.value) {
      result = validateRow(row)
      if (!result.valid) {
        invalidRows.value.push({
          rowIndex: index + 1,
          errors: result.errors
        })
      }
    }

    const lat = Number(row[mapping.lat])
    const lng = Number(row[mapping.lng])

    const zone = Math.floor((lng + 180) / 6) + 1;

    const [x, y] = proj4(
        "EPSG:4326",
        `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
        [lng, lat]
    );

    pointList.value.push({
      id: crypto.randomUUID(),
      row: pointList.value.length + 1,
      x: Number(x).toFixed(3),
      y: Number(y).toFixed(3),
      valid : result.valid
    });


    if ( Number.isNaN(lat) || Number.isNaN(lng)) {
      return
    }

    positionsCartesian.push(Cesium.Cartesian3.fromDegrees( lng, lat ))
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees( lng, lat ),
      point: {
        pixelSize: 6,
        color: result.valid  ? Cesium.Color.LIME  : Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1
      }
    })
    positions.push({
      lon : lng,
      lat : lat,
      color : result.valid  ? Cesium.Color.LIME  : Cesium.Color.RED,
    })
  })

  let shape = {
    type: 'multi_point',
    positions: positions,
    width: 5,
    color: Cesium.Color.LIME,
    show: true
  };

  let pin = {
    id : id ,
    name : pinName.value,
    //descr : formData.value.description,
    shape : shape,
    date :  new Date(),
    save : -1,
    type : 'draw'
  }

  if (SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save?? -1;
    props.pins[SelectGroup.value].children.push(pin);
  }
  else {
    pin.parent_id = -1;
    props.pins.push(pin);
  }

  // const toCartesian = (p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
  // const positionsCartesian = item.shape.positions.map(toCartesian)
  const bounding =  Cesium.BoundingSphere.fromPoints(positionsCartesian);
  props.viewer.camera.flyToBoundingSphere(bounding, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(
        0,
        -90,
        0
    )
  });

}

const summary = computed(() => ({
  total: props.rows.length,

  valid:
      props.rows.length -
      invalidRows.value.length,

  invalid:
  invalidRows.value.length
}))

defineExpose({open})
</script>