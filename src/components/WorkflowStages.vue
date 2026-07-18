<template>
  <div class="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
    <h2 class="text-2xl font-bold text-blue-800 mb-6">تعریف فرآیند جدید</h2>

    <!-- فرم اطلاعات عمومی فرآیند -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <label class="block mb-1 text-sm text-gray-600">نام فرآیند</label>
        <input v-model="name" type="text" class="w-full border px-4 py-2 rounded-md" placeholder="مثلاً: تایید فاکتور" />
      </div>
      <div>
        <label class="block mb-1 text-sm text-gray-600">نوع فرآیند</label>
        <select v-model="processType" class="w-full border px-4 py-2 rounded-md">
          <option disabled value="">انتخاب نوع</option>
          <option value="form">مبتنی بر فرم</option>
          <option value="map">مبتنی بر نقشه</option>
          <option value="file">مبتنی بر فایل</option>
        </select>
      </div>

    </div>


    <!-- انتخاب فرم فقط اگر نوع فرآیند "مبتنی بر فرم" باشد -->
    <div v-if="processType === 'form'" class="mt-4">
      <label class="block mb-1 text-sm text-gray-600">فرم مرتبط با فرآیند</label>
      <select v-model="selectedFormId" class="w-full border px-4 py-2 rounded-md">
        <option disabled value="">انتخاب فرم</option>
        <option v-for="form in forms" :key="form.id" :value="form.id">{{ form.title }}</option>
      </select>
    </div>

    <br/> <br/>
    <!-- افزودن مرحله جدید -->
    <div class="flex gap-4 items-end">
      <div class="flex-1">
        <label class="block mb-1 text-sm text-gray-600">مرحله بعدی (بخش یا کاربر)</label>
        <select v-model="newActor" class="w-full border px-4 py-2 rounded-md">
          <option disabled value="">انتخاب کنید</option>
          <option :value="{ value:0 , text:'مبداء'}">مبداء</option>
          <optgroup label="کاربران">
            <option v-for="user in users" :key="'u-' + user.id" :value="{ value: user.id, text:user.name}">{{ user.name }}</option>
          </optgroup>
          <optgroup label="دپارتمان‌ها">
            <option v-for="dep in departments" :key="'d-' + dep.id" :value="{ value: dep.id, text:dep.name}">{{ dep.name }}</option>
          </optgroup>
        </select>
      </div>

      <div class="flex-1">
        <label class="block mb-1 text-sm text-gray-600">عملیات</label>
        <select v-model="operType" class="w-full border px-4 py-2 rounded-md">
          <option :value="{ value: 'confirm', text: 'تایید موضوع' }">تایید موضوع</option>
          <option :value="{ value: 'start', text: 'بارگذاری موضوع' }">بارگذاری موضوع</option>
          <option :value="{ value: 'close', text: 'ختم موضوع' }">ختم موضوع</option>
          <option :value="{ value: 'end', text: 'پایان فرآیند' }">پایان فرآیند</option>
        </select>
      </div>
      <div class="flex1 items-end h-full w-32 justify-center">
        <button @click="addStage"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition">
          افزودن مرحله
        </button>
      </div>
    </div>

    <!-- چارت مراحل -->
    <div v-if="stages.length" class="mt-6">
      <h3 class="text-lg font-semibold text-blue-700 mb-4">مراحل فرآیند</h3>
      <div class="flex flex-wrap justify-start items-center">
        <div v-for="(stage, index) in stages" :key="index" class="flex items-center group relative">
          <div class="relative text-center">
            <NodeBox :node="stage" />
<!--            <div class="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md transition">-->
<!--              {{ getActorName(stage.destination) }}-->
<!--            </div>-->
            <!-- حذف -->
            <button @click="removeStage(index)"
                    class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs hidden group-hover:flex items-center justify-center">
              ×
            </button>
          </div>
<!--          <div v-if="index < stages.length - 1" class="mx-3 text-2xl text-gray-400">→</div>-->

          <div
              v-if="index < stages.length - 1"
              class="connector-line w-10 h-1 rounded" style="background: linear-gradient(90deg, var(--border), var(--accent));" />

        </div>
      </div>
    </div>

    <!-- دکمه نهایی -->
    <div class="mt-10 text-end">
      <button @click="submitForm"
              class="btn btn-primary">
        ذخیره فرآیند
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios';
import NodeBox from "../components/NodeBox.vue";
const SERVER = import.meta.env.VITE_SERVER
import { useToast } from "vue-toast-notification";

const $toast = useToast();
const users = ref([]);
const departments = ref([]);;

const processType = ref('map')
const operType = ref({ value: 'confirm', text: 'تایید موضوع' })
const selectedFormId = ref('')
const forms = ref([
  { id: 'f1', title: 'فرم مرخصی' },
  { id: 'f2', title: 'فرم درخواست خرید' },
  { id: 'f3', title: 'فرم تایید فاکتور' }
])

// داده‌ها
const name = ref('')
const description = ref('')
const stages = ref([])
const newActor = ref('')


const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) {
    console.log('Error loading users:', error);
  }
};

const load_Departments = async () => {
  try {
    const response = await axios.get(SERVER + '/api/departments');
    departments.value = response.data;
  } catch (error) {
    console.log('Error loading users:', error);
  }
};

function addStage() {
  if (!newActor.value) return

  let row = {
    dep_id: newActor.value.value,
    destination:newActor.value.text,
    name: operType.value.text,
    operation: operType.value.value
  }
  stages.value.push(row)
  newActor.value = ''
}

function removeStage(index) {
  stages.value.splice(index, 1)
}

function getActorName(actor) {
  const [type, id] = actor.split(':')
  if (type === 'user') return users.find(u => u.id == id)?.name || 'کاربر؟'
  if (type === 'department') return departments.find(d => d.id == id)?.name || 'بخش؟'
  return 'نامشخص'
}

async function submitForm() {
  if (!name.value.trim()) {
    showError('ورودی فرم ناقص است ، کامل کنید');
    return;
  }

  const workflow = {
    name: name.value,
    formId: 0,
    type : processType.value,
    steps: [...stages.value]
  }

  try {
    await axios.post(SERVER + '/api/workflow', workflow);
  } catch (error) {
    console.error('Error saving workflow:', error);
  }

  console.log('🚀 ارسال به سرور:', workflow)
  // اینجا می‌تونی API ارسال رو صدا بزنی
}

onMounted(async () => {
  //await Promise.all([load_Users(), load_Departments()]);
  await Promise.all([load_Departments()]);
});

function showError(msg) {
  $toast.open({
    message: msg,
    type: "error",
    duration: 4000   // ۲ ثانیه
  });
}

</script>
