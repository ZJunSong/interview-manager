<template>
  <div class="app">
    <TopBar @add="showAddModal = true" />

    <main class="main">
      <EmptyState v-if="interviews.length === 0" />

      <div v-else class="card-list">
        <InterviewCard
          v-for="(item, i) in interviews"
          :key="item.id"
          :interview="item"
          :index="i"
          @stage-click="onStageClick"
          @delete="onDeleteClick"
        />
      </div>
    </main>

    <ActionPopover
      :visible="!!activePopover"
      :rect="activePopover?.rect ?? null"
      @action="onPopoverAction"
      @close="closePopover"
    />

    <AddModal
      :visible="showAddModal"
      @close="showAddModal = false"
      @submit="onAdd"
    />

    <ConfirmDialog
      :visible="showConfirmDialog"
      :company-name="interviewToDelete?.company ?? ''"
      @confirm="onConfirmDelete"
      @cancel="showConfirmDialog = false"
    />

    <Toast :messages="toasts" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Interview, ToastMessage, StageStatus } from './types';
import { fetchInterviews, createInterview, updateStage, deleteInterview } from './api';
import TopBar from './components/TopBar.vue';
import EmptyState from './components/EmptyState.vue';
import InterviewCard from './components/InterviewCard.vue';
import ActionPopover from './components/ActionPopover.vue';
import AddModal from './components/AddModal.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import Toast from './components/Toast.vue';

// State
const interviews = ref<Interview[]>([]);
const toasts = ref<ToastMessage[]>([]);
const showAddModal = ref(false);
const showConfirmDialog = ref(false);
const interviewToDelete = ref<Interview | null>(null);

interface PopoverState {
  interviewId: string;
  stageIndex: number;
  rect: DOMRect;
}

const activePopover = ref<PopoverState | null>(null);
let toastCounter = 0;

// Toast
function showToast(text: string, type: 'success' | 'error') {
  const id = ++toastCounter;
  toasts.value.push({ id, text, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 2000);
}

// Load data
async function loadInterviews() {
  try {
    interviews.value = await fetchInterviews();
  } catch {
    showToast('加载数据失败', 'error');
  }
}

onMounted(() => {
  loadInterviews();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});

// Add
async function onAdd(company: string, position: string) {
  try {
    const newInterview = await createInterview(company, position);
    interviews.value.push(newInterview);
    showAddModal.value = false;
    showToast('添加成功', 'success');
  } catch {
    showToast('添加失败', 'error');
  }
}

// Stage click → show popover
function onStageClick(interviewId: string, stageIndex: number, el: HTMLElement) {
  activePopover.value = {
    interviewId,
    stageIndex,
    rect: el.getBoundingClientRect()
  };
}

// Popover action
async function onPopoverAction(status: StageStatus) {
  if (!activePopover.value) return;
  const { interviewId, stageIndex } = activePopover.value;
  try {
    const updated = await updateStage(interviewId, stageIndex, status);
    const idx = interviews.value.findIndex(i => i.id === interviewId);
    if (idx !== -1) {
      interviews.value[idx] = updated;
    }
    closePopover();
    showToast('状态已更新', 'success');
  } catch {
    closePopover();
    showToast('更新失败', 'error');
  }
}

function closePopover() {
  activePopover.value = null;
}

// Delete
function onDeleteClick(interviewId: string) {
  const item = interviews.value.find(i => i.id === interviewId);
  if (item) {
    interviewToDelete.value = item;
    showConfirmDialog.value = true;
  }
}

async function onConfirmDelete() {
  if (!interviewToDelete.value) return;
  const id = interviewToDelete.value.id;
  try {
    await deleteInterview(id);
    interviews.value = interviews.value.filter(i => i.id !== id);
    showConfirmDialog.value = false;
    interviewToDelete.value = null;
    showToast('已删除', 'success');
  } catch {
    showConfirmDialog.value = false;
    showToast('删除失败', 'error');
  }
}

// Escape key handler
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (activePopover.value) {
      closePopover();
    } else if (showAddModal.value) {
      showAddModal.value = false;
    } else if (showConfirmDialog.value) {
      showConfirmDialog.value = false;
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
