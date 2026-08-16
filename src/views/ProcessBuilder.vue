<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">ایجاد فرآیند جدید</h1>
        <p class="page-subtitle">مراحل و روابط فرآیند را تعریف کنید</p>
      </div>
    </div>

    <div class="builder-layout">
      <div class="card builder-section">
        <h2 class="section-title"><i class="fas fa-tag"></i> اطلاعات فرآیند</h2>
        <div class="form-row">
          <label>نام فرآیند</label>
          <input v-model="process.name" class="input" placeholder="مثلاً درخواست مرخصی" />
        </div>
      </div>

      <div class="card builder-section">
        <div class="section-header">
          <h2 class="section-title"><i class="fas fa-list-ol"></i> مراحل فرآیند</h2>
          <button @click="addStep" class="btn btn-primary btn-sm">
            <i class="fas fa-plus"></i> افزودن مرحله
          </button>
        </div>

        <div v-if="!process.steps.length" class="empty-sm">هنوز مرحله‌ای تعریف نشده است</div>

        <div v-for="(step, index) in process.steps" :key="index" class="step-item">
          <div class="step-header">
            <span class="step-index">{{ index + 1 }}</span>
            <input v-model="step.name" class="input step-name" placeholder="نام مرحله" />
            <select v-model="step.type" class="select-native step-type">
              <option value="manual">دستی</option>
              <option value="automatic">خودکار</option>
              <option value="decision">شرطی</option>
            </select>
            <button @click="removeStep(index)" class="btn btn-danger btn-sm step-remove" title="حذف مرحله">
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <div v-if="step.type === 'decision'" class="step-conditional">
            <label class="block text-sm mb-1">شرط:</label>
            <input v-model="step.config.condition" class="input" placeholder="مثلاً approved == true" dir="ltr" />
          </div>
        </div>
      </div>

      <div class="card builder-section">
        <div class="section-header">
          <h2 class="section-title"><i class="fas fa-project-diagram"></i> روابط بین مراحل</h2>
          <button @click="addRelation" class="btn btn-primary btn-sm">
            <i class="fas fa-plus"></i> افزودن رابطه
          </button>
        </div>

        <div v-if="!process.relations.length" class="empty-sm">هنوز رابطه‌ای تعریف نشده است</div>

        <div v-for="(rel, i) in process.relations" :key="i" class="relation-item">
          <div class="relation-grid">
            <div class="form-row">
              <label>از مرحله</label>
              <input v-model.number="rel.from_step_id" type="number" class="input" placeholder="از" />
            </div>
            <div class="relation-arrow"><i class="fas fa-long-arrow-alt-left"></i></div>
            <div class="form-row">
              <label>به مرحله</label>
              <input v-model.number="rel.to_step_id" type="number" class="input" placeholder="به" />
            </div>
            <div class="form-row">
              <label>نوع رابطه</label>
              <select v-model="rel.type" class="select-native">
                <option value="sequence">توالی</option>
                <option value="parallel">موازی</option>
                <option value="conditional">شرطی</option>
              </select>
            </div>
            <div v-if="rel.type === 'conditional'" class="form-row relation-condition">
              <label>شرط</label>
              <input v-model="rel.condition" class="input" placeholder="مثلاً approved==true" dir="ltr" />
            </div>
            <button @click="removeRelation(i)" class="btn btn-danger btn-sm relation-remove" title="حذف رابطه">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="builder-actions">
        <button @click="saveProcess" class="btn btn-primary btn-lg">
          <i class="fas fa-save"></i> ذخیره فرآیند
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { createProcess } from '../api'

const process = reactive({
  name: '',
  steps: [],
  relations: []
})

function addStep() { process.steps.push({ name: '', type: 'manual', config: {} }) }
function removeStep(i) { process.steps.splice(i, 1) }

function addRelation() { process.relations.push({ from_step_id: null, to_step_id: null, type: 'sequence' }) }
function removeRelation(i) { process.relations.splice(i, 1) }

async function saveProcess() {
  try {
    const res = await createProcess(process)
    alert('فرآیند با موفقیت ذخیره شد: ID ' + res.process.id)
  } catch (err) {
    alert('خطا در ذخیره فرآیند: ' + err.message)
  }
}
</script>

<style scoped>
.builder-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
}

.builder-section { padding: 20px; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}

.section-title i {
  color: var(--accent);
  font-size: 14px;
}

.empty-sm {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.step-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 10px;
}

.step-header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.step-index {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-glow);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-name { flex: 1; min-width: 160px; }
.step-type { width: 130px; flex-shrink: 0; }
.step-remove { flex-shrink: 0; }

.step-conditional {
  margin-top: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
}

.relation-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 10px;
}

.relation-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr 1fr 1fr auto;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
}

.relation-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 16px;
  padding-bottom: 10px;
}

.relation-remove {
  height: 38px;
  margin-bottom: 0;
}

.builder-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .relation-grid { grid-template-columns: 1fr 1fr; }
  .relation-arrow { display: none; }
  .relation-remove { grid-column: 1 / -1; }
}

@media (max-width: 600px) {
  .relation-grid { grid-template-columns: 1fr; }
  .step-header { flex-direction: column; align-items: stretch; }
  .step-type { width: 100%; }
  .step-remove { align-self: flex-start; }
  .builder-section { padding: 14px; }
}
</style>
