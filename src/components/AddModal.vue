<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
        <h2 id="add-modal-title" class="modal-title">新增面试记录</h2>

        <div class="modal-field">
          <label class="field-label" for="add-company">公司名称</label>
          <div ref="companyInputWrap" class="field-input-wrap">
            <input
              id="add-company"
              ref="companyInput"
              v-model="company"
              class="field-input"
              placeholder="输入公司名称"
              autocomplete="off"
              @keydown="onCompanyKeydown"
              @focus="showCompanyDropdown = true"
              @input="onCompanyInput"
            />
            <Transition name="dropdown">
              <ul v-if="showCompanyDropdown && filteredCompanies.length > 0" class="dropdown">
                <li class="dropdown-header" v-if="!company">常见公司</li>
                <li
                  v-for="(item, i) in filteredCompanies"
                  :key="item"
                  class="dropdown-item"
                  :class="{ active: i === companyHighlight }"
                  @click="selectCompany(item)"
                  @mouseenter="companyHighlight = i"
                >{{ item }}</li>
              </ul>
            </Transition>
          </div>
        </div>

        <div class="modal-field">
          <label class="field-label" for="add-position">投递职位</label>
          <div ref="positionInputWrap" class="field-input-wrap">
            <input
              id="add-position"
              ref="positionInput"
              v-model="position"
              class="field-input"
              placeholder="输入投递职位"
              autocomplete="off"
              @keydown="onPositionKeydown"
              @focus="showPositionDropdown = true"
              @input="onPositionInput"
            />
            <Transition name="dropdown">
              <ul v-if="showPositionDropdown && filteredPositions.length > 0" class="dropdown">
                <li class="dropdown-header" v-if="!position">常用职位</li>
                <li
                  v-for="(item, i) in filteredPositions"
                  :key="item"
                  class="dropdown-item"
                  :class="{ active: i === positionHighlight }"
                  @click="selectPosition(item)"
                  @mouseenter="positionHighlight = i"
                >{{ item }}</li>
              </ul>
            </Transition>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="close">取消</button>
          <button type="button" class="btn-submit" @click="submit">确认添加</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue';

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
const companyInputWrap = ref<HTMLElement | null>(null);
const positionInputWrap = ref<HTMLElement | null>(null);
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
      e.stopPropagation();
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
      e.stopPropagation();
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

function onDocumentClick(e: MouseEvent) {
  // 点击下拉建议外部时关闭对应下拉
  const target = e.target as Node;
  if (showCompanyDropdown.value && !companyInputWrap.value?.contains(target)) {
    showCompanyDropdown.value = false;
  }
  if (showPositionDropdown.value && !positionInputWrap.value?.contains(target)) {
    showPositionDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

watch(() => props.visible, (val) => {
  if (val) {
    reset();
    nextTick(() => companyInput.value?.focus());
  }
});
</script>

<style scoped>
@import '../assets/styles/modal.css';

.field-input-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  max-height: 220px;
  overflow-y: auto;
  z-index: 10;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.dropdown::-webkit-scrollbar {
  width: 6px;
}
.dropdown::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}

.dropdown-header {
  padding: 6px 10px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-item.active,
.dropdown-item:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: 500;
}

/* 下拉展开/收起动画 */
.dropdown-enter-active {
  transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}
.dropdown-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
