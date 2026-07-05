<template>
  <div class="app">
    <!-- Auth screens -->
    <template v-if="!isAuthenticated">
      <LoginCard 
        v-if="authMode === 'login'"
        @switch-to-register="authMode = 'register'"
        @login-success="handleAuthSuccess"
      />
      <RegisterCard 
        v-else
        @switch-to-login="authMode = 'login'"
        @register-success="handleAuthSuccess"
      />
    </template>
    
    <!-- Main app (when authenticated) -->
    <template v-else>
      <div class="user-bar">
        <span class="user-info">👤 {{ currentUser?.username }}</span>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
      
      <TopBar
        :search-query="searchQuery"
        :sort-by="sortBy"
        :total-count="interviews.length"
        :filtered-count="filteredInterviews.length"
        @add="showAddModal = true"
        @update:search-query="searchQuery = $event"
        @update:sort-by="sortBy = $event"
        @export="onExport"
        @import="onImportFile"
      />

      <main class="main">
        <div v-if="loading" class="loading" role="status" aria-live="polite">
          <div class="loading-spinner" aria-hidden="true"></div>
          <span>加载中…</span>
        </div>

        <template v-else>
          <StatsPanel v-if="interviews.length > 0" :interviews="interviews" />
          <EmptyState v-if="interviews.length === 0" />
          <EmptyState v-else-if="filteredInterviews.length === 0 && searchQuery" :is-search="true" />

          <div v-else class="card-list">
            <InterviewCard
              v-for="(item, i) in filteredInterviews"
              :key="item.id"
              :interview="item"
              :index="i"
              @stage-click="onStageClick"
              @delete="onDeleteClick"
              @edit="onEditClick"
            />
          </div>
        </template>
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

      <EditModal
        :visible="showEditModal"
        :interview="interviewToEdit"
        @close="showEditModal = false"
        @submit="onEditSubmit"
      />

      <ConfirmDialog
        :visible="showConfirmDialog"
        :company-name="interviewToDelete?.company ?? ''"
        @confirm="onConfirmDelete"
        @cancel="onCancelDelete"
      />

      <Toast :messages="toasts" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Interview, ToastMessage, StageStatus } from './types';
import { fetchInterviews, createInterview, updateStage, deleteInterview, updateInterview, exportInterviews, importInterviews } from './api';
import LoginCard from './components/LoginCard.vue';
import RegisterCard from './components/RegisterCard.vue';
import TopBar from './components/TopBar.vue';
import EmptyState from './components/EmptyState.vue';
import InterviewCard from './components/InterviewCard.vue';
import ActionPopover from './components/ActionPopover.vue';
import AddModal from './components/AddModal.vue';
import EditModal from './components/EditModal.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import StatsPanel from './components/StatsPanel.vue';
import Toast from './components/Toast.vue';

// Auth state
const isAuthenticated = ref(false);
const currentUser = ref<{ id: number; username: string } | null>(null);
const authMode = ref<'login' | 'register'>('login');

// App state
const loading = ref(true);
const interviews = ref<Interview[]>([]);
const toasts = ref<ToastMessage[]>([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showConfirmDialog = ref(false);
const interviewToDelete = ref<Interview | null>(null);
const interviewToEdit = ref<Interview | null>(null);
const searchQuery = ref('');
const sortBy = ref('newest');

interface PopoverState {
  interviewId: string;
  stageIndex: number;
  rect: DOMRect;
}

const activePopover = ref<PopoverState | null>(null);
let toastCounter = 0;
const busy = ref(false);

const anyModalOpen = computed(() => showAddModal.value || showEditModal.value || showConfirmDialog.value);
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

function getProgress(item: Interview): number {
  return item.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
}

const filteredInterviews = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = interviews.value;

  if (q) {
    list = list.filter(item =>
      item.company.toLowerCase().includes(q) ||
      item.position.toLowerCase().includes(q)
    );
  }

  const sorted = [...list];
  switch (sortBy.value) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'company':
      sorted.sort((a, b) => a.company.localeCompare(b.company, 'zh-CN'));
      break;
    case 'progress':
      sorted.sort((a, b) => getProgress(b) - getProgress(a));
      break;
  }

  return sorted;
});

function showToast(text: string, type: 'success' | 'error') {
  const id = ++toastCounter;
  toasts.value.push({ id, text, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 2000);
}

// Auth handlers
function handleAuthSuccess(data: { token: string; user: { id: number; username: string } }) {
  currentUser.value = data.user;
  isAuthenticated.value = true;
  loadInterviews();
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser.value = null;
  isAuthenticated.value = false;
  interviews.value = [];
}

// Check auth on mount
onMounted(() => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      currentUser.value = user;
      isAuthenticated.value = true;
      loadInterviews();
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } else {
    loading.value = false;
  }
  
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
  document.body.style.overflow = '';
});

async function loadInterviews() {
  try {
    loading.value = true;
    const token = localStorage.getItem('token');
    const res = await fetch('/api/interviews', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    interviews.value = await res.json();
  } catch {
    showToast('加载数据失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function onAdd(company: string, position: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ company, position })
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    const newInterview = await res.json();
    interviews.value.push(newInterview);
    showAddModal.value = false;
    showToast('添加成功', 'success');
  } catch {
    showToast('添加失败', 'error');
  } finally {
    busy.value = false;
  }
}

function onEditClick(interviewId: string) {
  const item = interviews.value.find(i => i.id === interviewId);
  if (item) {
    interviewToEdit.value = item;
    showEditModal.value = true;
  }
}

async function onEditSubmit(company: string, position: string) {
  if (busy.value) return;
  if (!interviewToEdit.value) return;
  busy.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/interviews/${interviewToEdit.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ company, position })
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    const updated = await res.json();
    const idx = interviews.value.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      interviews.value[idx] = updated;
    }
    showEditModal.value = false;
    interviewToEdit.value = null;
    showToast('已更新', 'success');
  } catch {
    showToast('更新失败', 'error');
  } finally {
    busy.value = false;
  }
}

function onStageClick(interviewId: string, stageIndex: number, el: HTMLElement) {
  activePopover.value = {
    interviewId,
    stageIndex,
    rect: el.getBoundingClientRect()
  };
}

async function onPopoverAction(status: StageStatus) {
  if (busy.value) return;
  if (!activePopover.value) return;
  const { interviewId, stageIndex } = activePopover.value;
  busy.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/interviews/${interviewId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ stageIndex, status })
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    const updated = await res.json();
    const idx = interviews.value.findIndex(i => i.id === interviewId);
    if (idx !== -1) {
      interviews.value[idx] = updated;
    }
    closePopover();
    showToast('状态已更新', 'success');
  } catch {
    closePopover();
    showToast('更新失败', 'error');
  } finally {
    busy.value = false;
  }
}

function closePopover() {
  activePopover.value = null;
}

function onDeleteClick(interviewId: string) {
  const item = interviews.value.find(i => i.id === interviewId);
  if (item) {
    interviewToDelete.value = item;
    showConfirmDialog.value = true;
  }
}

function onCancelDelete() {
  showConfirmDialog.value = false;
  interviewToDelete.value = null;
}

async function onConfirmDelete() {
  if (busy.value) return;
  if (!interviewToDelete.value) return;
  const id = interviewToDelete.value.id;
  busy.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/interviews/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    interviews.value = interviews.value.filter(i => i.id !== id);
    showConfirmDialog.value = false;
    interviewToDelete.value = null;
    showToast('已删除', 'success');
  } catch {
    showConfirmDialog.value = false;
    showToast('删除失败', 'error');
  } finally {
    busy.value = false;
  }
}

async function onExport() {
  if (busy.value) return;
  busy.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/interviews/export', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interviews-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
  } catch {
    showToast('导出失败', 'error');
  } finally {
    busy.value = false;
  }
}

async function onImportFile(file: File) {
  if (busy.value) return;
  busy.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text) as Interview[];
    if (!Array.isArray(data)) {
      showToast('文件格式无效', 'error');
      return;
    }
    
    const token = localStorage.getItem('token');
    const res = await fetch('/api/interviews/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data, mode: 'merge' })
    });
    
    if (res.status === 401) {
      handleLogout();
      return;
    }
    
    const result = await res.json();
    if (result.count > 0) {
      await loadInterviews();
      showToast(`成功导入 ${result.count} 条记录`, 'success');
    } else {
      showToast('没有新记录需要导入（已去重）', 'success');
    }
  } catch {
    showToast('导入失败，请检查文件格式', 'error');
  } finally {
    busy.value = false;
  }
}

function onViewportChange() {
  if (activePopover.value) closePopover();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (activePopover.value) {
      closePopover();
    } else if (showEditModal.value) {
      showEditModal.value = false;
    } else if (showAddModal.value) {
      showAddModal.value = false;
    } else if (showConfirmDialog.value) {
      onCancelDelete();
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.user-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.user-info {
  font-size: 14px;
  color: #666;
}

.logout-btn {
  padding: 6px 12px;
  font-size: 13px;
  color: #666;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl);
}

@media (max-width: 600px) {
  .main {
    padding: var(--space-md);
  }
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-3xl);
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border-strong);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
