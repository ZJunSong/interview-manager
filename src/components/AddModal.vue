<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal">
        <h2 class="modal-title">新增面试记录</h2>

        <div class="modal-field">
          <label class="field-label">公司名称</label>
          <div class="field-input-wrap">
            <input
              ref="companyInput"
              v-model="company"
              class="field-input"
              placeholder="输入公司名称"
              @keydown="onCompanyKeydown"
              @focus="showCompanyDropdown = true"
              @input="onCompanyInput"
            />
            <ul v-if="showCompanyDropdown && filteredCompanies.length > 0" class="dropdown">
              <li
                v-for="(item, i) in filteredCompanies"
                :key="item"
                class="dropdown-item"
                :class="{ active: i === companyHighlight }"
                @click="selectCompany(item)"
                @mouseenter="companyHighlight = i"
              >{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="modal-field">
          <label class="field-label">投递职位</label>
          <div class="field-input-wrap">
            <input
              ref="positionInput"
              v-model="position"
              class="field-input"
              placeholder="输入投递职位"
              @keydown="onPositionKeydown"
              @focus="showPositionDropdown = true"
              @input="onPositionInput"
            />
            <ul v-if="showPositionDropdown && filteredPositions.length > 0" class="dropdown">
              <li
                v-for="(item, i) in filteredPositions"
                :key="item"
                class="dropdown-item"
                :class="{ active: i === positionHighlight }"
                @click="selectPosition(item)"
                @mouseenter="positionHighlight = i"
              >{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="close">取消</button>
          <button class="btn-submit" @click="submit">确认添加</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [company: string, position: string];
}>();

const COMPANIES = [
  '腾讯', '阿里巴巴', '字节跳动', '美团', '拼多多', '华为', '快手', '小红书',
  '蚂蚁集团', '携程', '百度', '京东', '网易', '滴滴', '小米', 'OPPO', 'vivo',
  '中兴', '联想', '比亚迪', '蔚来', '理想汽车', '小鹏汽车', '大疆', '海康威视',
  '商汤科技', '旷视科技', '科大讯飞', '网易有道', '哔哩哔哩', '爱奇艺', '得物',
  'Boss直聘', '知乎', '新浪'
];

const POSITIONS = ['后端开发', 'AI Agent 开发', 'AI+后端开发'];

const company = ref('');
const position = ref('');
const companyInput = ref<HTMLInputElement | null>(null);
const positionInput = ref<HTMLInputElement | null>(null);
const showCompanyDropdown = ref(false);
const showPositionDropdown = ref(false);
const companyHighlight = ref(0);
const positionHighlight = ref(0);

const filteredCompanies = ref<string[]>([]);
const filteredPositions = ref<string[]>(POSITIONS);

function filterList(list: string[], query: string): string[] {
  if (!query) return list;
  return list.filter(item => item.includes(query));
}

function onCompanyInput() {
  companyHighlight.value = 0;
  filteredCompanies.value = filterList(COMPANIES, company.value);
  showCompanyDropdown.value = true;
}

function onPositionInput() {
  positionHighlight.value = 0;
  filteredPositions.value = filterList(POSITIONS, position.value);
  showPositionDropdown.value = true;
}

function selectCompany(val: string) {
  company.value = val;
  showCompanyDropdown.value = false;
  nextTick(() => positionInput.value?.focus());
}

function selectPosition(val: string) {
  position.value = val;
  showPositionDropdown.value = false;
}

function onCompanyKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (showCompanyDropdown.value && filteredCompanies.value.length > 0) {
      selectCompany(filteredCompanies.value[companyHighlight.value]);
    } else {
      showCompanyDropdown.value = false;
      nextTick(() => positionInput.value?.focus());
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (companyHighlight.value < filteredCompanies.value.length - 1) {
      companyHighlight.value++;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (companyHighlight.value > 0) {
      companyHighlight.value--;
    }
  } else if (e.key === 'Escape') {
    if (showCompanyDropdown.value) {
      showCompanyDropdown.value = false;
    } else {
      close();
    }
  }
}

function onPositionKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (showPositionDropdown.value && filteredPositions.value.length > 0) {
      selectPosition(filteredPositions.value[positionHighlight.value]);
      nextTick(() => submit());
    } else {
      submit();
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (positionHighlight.value < filteredPositions.value.length - 1) {
      positionHighlight.value++;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (positionHighlight.value > 0) {
      positionHighlight.value--;
    }
  } else if (e.key === 'Escape') {
    if (showPositionDropdown.value) {
      showPositionDropdown.value = false;
    } else {
      close();
    }
  }
}

function submit() {
  if (!company.value.trim() || !position.value.trim()) return;
  emit('submit', company.value.trim(), position.value.trim());
}

function close() {
  emit('close');
}

function reset() {
  company.value = '';
  position.value = '';
  showCompanyDropdown.value = false;
  showPositionDropdown.value = false;
  companyHighlight.value = 0;
  positionHighlight.value = 0;
  filteredCompanies.value = [];
  filteredPositions.value = POSITIONS;
}

watch(() => props.visible, (val) => {
  if (val) {
    reset();
    nextTick(() => companyInput.value?.focus());
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--backdrop-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in var(--duration-fast) var(--ease-out);
}

.modal {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: var(--space-xl);
  width: 400px;
  max-width: 90vw;
  animation: scale-in var(--duration-normal) var(--ease-spring);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-lg);
}

.modal-field {
  margin-bottom: var(--space-md);
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.field-input-wrap {
  position: relative;
}

.field-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: border-color var(--duration-fast) var(--ease-out);
  background: var(--color-surface-solid);
}

.field-input:focus {
  border-color: var(--color-accent);
}

.field-input::placeholder {
  color: var(--color-text-tertiary);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.dropdown-item {
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.dropdown-item.active,
.dropdown-item:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-cancel:hover {
  background: var(--color-bg);
}

.btn-submit {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  background: var(--color-accent);
  color: #fff;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-submit:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}
</style>
