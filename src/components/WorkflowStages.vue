<template>
  <div class="card workflow-card">
    <h2 class="workflow-title">تعریف فرآیند جدید</h2>

    <!-- فرم اطلاعات عمومی فرآیند -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <label class="block mb-1 text-sm">نام فرآیند</label>
        <input v-model="name" type="text" class="input" placeholder="مثلاً: تایید فاکتور" />
      </div>
      <div>
        <label class="block mb-1 text-sm">نوع فرآیند</label>
        <select v-model="processType" class="select-native">
          <option disabled value="">انتخاب نوع</option>
          <option value="form">مبتنی بر فرم</option>
          <option value="map">مبتنی بر نقشه</option>
          <option value="file">مبتنی بر فایل</option>
        </select>
      </div>
    </div>

    <!-- انتخاب فرم فقط اگر نوع فرآیند "مبتنی بر فرم" باشد -->
    <div v-if="processType === 'form'" class="mt-4">
      <label class="block mb-1 text-sm">فرم مرتبط با فرآیند</label>
      <select v-model="selectedFormId" class="select-native">
        <option disabled value="">انتخاب فرم</option>
        <option v-for="form in forms" :key="form.id" :value="form.id">{{ form.title }}</option>
      </select>
    </div>

    <!-- افزودن مرحله جدید -->
    <div class="stage-form">
      <div class="flex-1">
        <label class="block mb-1 text-sm">مرحله بعدی (بخش یا کاربر)</label>
        <select v-model="newActor" class="select-native">
          <option disabled value="">انتخاب کنید</option>
          <option :value="{ value: 0, text: 'مبداء' }">مبداء</option>
          <optgroup label="کاربران">
            <option v-for="user in users" :key="'u-' + user.id" :value="{ value: user.id, text: user.name }">{{ user.name }}</option>
          </optgroup>
          <optgroup label="دپارتمان‌ها">
            <option v-for="dep in departments" :key="'d-' + dep.id" :value="{ value: dep.id, text: dep.name }">{{ dep.name }}</option>
          </optgroup>
        </select>
      </div>

      <div class="flex-1">
        <label class="block mb-1 text-sm">عملیات</label>
        <select v-model="operType" class="select-native">
          <option :value="{ value: 'confirm', text: 'تایید موضوع' }">تایید موضوع</option>
          <option :value="{ value: 'start', text: 'بارگذاری موضوع' }">بارگذاری موضوع</option>
          <option :value="{ value: 'close', text: 'ختم موضوع' }">ختم موضوع</option>
          <option :value="{ value: 'end', text: 'پایان فرآیند' }">پایان فرآیند</option>
        </select>
      </div>

      <div class="stage-add-btn">
        <button @click="addStage" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          افزودن مرحله
        </button>
      </div>
    </div>

    <!-- چارت مراحل -->
    <div v-if="stages.length" class="mt-8">
      <h3 class="stage-subtitle">مراحل فرآیند</h3>
      <div class="stage-flow">
        <div v-for="(stage, index) in stages" :key="index" class="stage-node-wrap">
          <div class="relative">
            <NodeBox :node="stage" />
            <button
              @click="removeStage(index)"
              class="stage-remove"
              title="حذف مرحله"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div
            v-if="index < stages.length - 1"
            class="connector-line"
          />
        </div>
      </div>
    </div>

    <!-- دکمه نهایی -->
    <div class="mt-10 text-end">
      <button @click="submitForm" class="btn btn-primary btn-lg">
        <i class="fas fa-save"></i>
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
const departments = ref([]);

const processType = ref('map')
const operType = ref({ value: 'confirm', text: 'تایید موضوع' })
const selectedFormId = ref('')
const forms = ref([
  { id: 'f1', title: 'فرم مرخصی' },
  { id: 'f2', title: 'فرم درخواست خرید' },
  { id: 'f3', title: 'فرم تایید فاکتور' }
])

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
    destination: newActor.value.text,
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
    type: processType.value,
    steps: [...stages.value]
  }

  try {
    await axios.post(SERVER + '/api/workflow', workflow);
  } catch (error) {
    console.error('Error saving workflow:', error);
  }
}

onMounted(async () => {
  await Promise.all([load_Departments()]);
});

function showError(msg) {
  $toast.open({
    message: msg,
    type: "error",
    duration: 4000
  });
}

</script>

<style scoped>
.workflow-card {
  padding: 28px;
}

.workflow-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 10px;
}

.workflow-title::before {
  content: "";
  width: 4px;
  height: 22px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--accent), var(--accent-dim));
}

.stage-form {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-top: 16px;
  flex-wrap: wrap;
}

.stage-add-btn {
  display: flex;
  align-items: flex-end;
}

.stage-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-subtitle::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.stage-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0;
}

.stage-node-wrap {
  display: flex;
  align-items: center;
}

.stage-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 2;
}

.stage-node-wrap:hover .stage-remove {
  opacity: 1;
}

.connector-line {
  width: 48px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-dim));
  margin: 0 4px;
  flex-shrink: 0;
  position: relative;
}

.connector-line::after {
  content: "";
  position: absolute;
  right: 50%;
  top: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent-glow-strong);
  border: 1px solid var(--accent);
}

@media (max-width: 768px) {
  .workflow-card { padding: 18px; }
  .stage-form { flex-direction: column; align-items: stretch; gap: 12px; }
  .stage-add-btn .btn { width: 100%; }
  .connector-line { width: 28px; }
  .workflow-title { font-size: 17px; }
}
</style>
