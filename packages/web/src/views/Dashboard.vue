<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <span class="logo-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#2563eb"/>
            <circle cx="16" cy="13" r="5" stroke="#fff" stroke-width="2"/>
            <path d="M6 25c0-4 4-7 10-7s10 3 10 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <h1 class="logo">面试记录管理器</h1>
      </div>
      <div class="header-right">
        <span class="user-info">{{ user?.username }}</span>
        <router-link v-if="user?.role === 'admin'" to="/admin" class="admin-link">管理后台</router-link>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="main">
      <div class="toolbar">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="搜索公司或职位..." />
        </div>
        <div class="toolbar-actions">
          <select v-model="sortBy" class="sort-select">
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
            <option value="company">按公司名</option>
            <option value="progress">按进度</option>
            <option value="recentVisit">最近访问</option>
          </select>
          <button class="btn btn-primary" @click="showAddModal = true">+ 添加面试</button>
          <button class="btn btn-secondary" @click="handleExport">导出</button>
          <label class="btn btn-secondary">
            导入
            <input type="file" accept=".json" @change="handleImport" hidden />
          </label>
        </div>
      </div>

      <StatsPanel v-if="interviews.length > 0" :interviews="interviews" />

      <div v-if="loading" class="loading">加载中...</div>

      <EmptyState
        v-else-if="filteredInterviews.length === 0"
        :is-search="!!searchQuery"
      />

      <div v-else class="card-list">
        <div v-for="item in filteredInterviews" :key="item.id" class="card" :class="getVisitStatusClass(item)">
          <div class="card-header">
            <div class="card-info">
              <h2 class="card-company" :class="{ 'has-url': item.url }" @click="item.url && handleVisit(item)">
                {{ item.company }}
                <span v-if="item.url" class="url-icon" title="点击访问招聘页面">↗</span>
              </h2>
              <span class="card-position">{{ item.position }}</span>
              <span class="card-date">{{ (item.createdAt || '').slice(0, 10) }} 投递</span>
            </div>
            <div class="card-actions">
              <button class="btn-icon" @click="editInterview(item)">编辑</button>
              <button class="btn-icon btn-danger" @click="confirmDelete(item)">删除</button>
            </div>
          </div>

          <div class="card-timeline scrollbar-thin">
            <div
              v-for="(stage, i) in item.stages"
              :key="i"
              class="timeline-node"
              :class="[`status-${stage.status}`, { clickable: stage.status === 'current' }]"
              @click="stage.status === 'current' && openStageMenu(item.id, i, $event)"
            >
              <div class="node-dot"></div>
              <div class="node-label">{{ stage.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <h3>添加面试记录</h3>
        <form @submit.prevent="handleAdd">
          <div class="form-group">
            <label>公司名称</label>
            <input v-model="addForm.company" type="text" required placeholder="例如：腾讯" />
          </div>
          <div class="form-group">
            <label>职位名称</label>
            <input v-model="addForm.position" type="text" required placeholder="例如：前端工程师" />
          </div>
          <div class="form-group">
            <label>招聘页面链接 <span class="optional">（选填）</span></label>
            <input v-model="addForm.url" type="url" placeholder="例如：https://jobs.example.com/123" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">取消</button>
            <button type="submit" class="btn btn-primary">添加</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <h3>编辑面试记录</h3>
        <form @submit.prevent="handleEdit">
          <div class="form-group">
            <label>公司名称</label>
            <input v-model="editForm.company" type="text" required />
          </div>
          <div class="form-group">
            <label>职位名称</label>
            <input v-model="editForm.position" type="text" required />
          </div>
          <div class="form-group">
            <label>招聘页面链接 <span class="optional">（选填）</span></label>
            <input v-model="editForm.url" type="url" placeholder="例如：https://jobs.example.com/123" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showEditModal = false">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="showDeleteDialog = false">
      <div class="modal modal-small">
        <h3>确认删除</h3>
        <p>确定要删除 {{ deleteTarget?.company }} 的面试记录吗？</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteDialog = false">取消</button>
          <button class="btn btn-danger" @click="handleDelete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="stageMenu.visible" class="stage-menu" :style="{ top: stageMenu.y + 'px', left: stageMenu.x + 'px' }">
      <button @click="updateStageStatus('pass')">通过</button>
      <button @click="updateStageStatus('fail')">未通过</button>
      <button @click="updateStageStatus('rejected')">已拒绝</button>
      <button @click="updateStageStatus('skip')">跳过</button>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Interview } from '../types';
import { fetchInterviews, createInterview, updateStage, deleteInterview, updateInterview, exportInterviews, importInterviews, recordVisit } from '../api';
import StatsPanel from '../components/StatsPanel.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const user = ref<any>(null);
const loading = ref(true);
const interviews = ref<Interview[]>([]);
const searchQuery = ref('');
const sortBy = ref('newest');

const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteDialog = ref(false);
const deleteTarget = ref<Interview | null>(null);
const editTarget = ref<Interview | null>(null);

const addForm = ref({ company: '', position: '', url: '' });
const editForm = ref({ company: '', position: '', url: '' });

const stageMenu = ref({ visible: false, x: 0, y: 0, interviewId: '', stageIndex: 0 });

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 2000);
}

const filteredInterviews = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = interviews.value;

  if (q) {
    list = list.filter(i => i.company.toLowerCase().includes(q) || i.position.toLowerCase().includes(q));
  }

  const sorted = [...list];
  switch (sortBy.value) {
    case 'newest': sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    case 'oldest': sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
    case 'company': sorted.sort((a, b) => a.company.localeCompare(b.company, 'zh-CN')); break;
    case 'progress': sorted.sort((a, b) => getProgress(b) - getProgress(a)); break;
    case 'recentVisit':
      sorted.sort((a, b) => {
        // 有访问记录的排在前面
        if (a.lastVisitedAt && b.lastVisitedAt) {
          return new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime();
        }
        if (a.lastVisitedAt) return -1;
        if (b.lastVisitedAt) return 1;
        // 都没有访问记录的按创建时间排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;
  }

  return sorted;
});

function getProgress(item: Interview): number {
  return item.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
}

function getVisitStatusClass(item: Interview): string {
  if (!item.lastVisitedAt || !item.url) return '';

  const lastVisit = new Date(item.lastVisitedAt).getTime();
  const now = Date.now();
  const hoursSinceVisit = (now - lastVisit) / (1000 * 60 * 60);

  if (hoursSinceVisit < 4) return 'visit-fresh';
  if (hoursSinceVisit < 8) return 'visit-normal';
  if (hoursSinceVisit < 12) return 'visit-warning';
  return 'visit-danger';
}

function getVisitStatusLabel(item: Interview): string {
  if (!item.lastVisitedAt || !item.url) return '';

  const lastVisit = new Date(item.lastVisitedAt).getTime();
  const now = Date.now();
  const hoursSinceVisit = (now - lastVisit) / (1000 * 60 * 60);

  if (hoursSinceVisit < 1) return '刚刚访问';
  if (hoursSinceVisit < 4) return `${Math.floor(hoursSinceVisit)}小时前访问`;
  if (hoursSinceVisit < 24) return `${Math.floor(hoursSinceVisit)}小时前访问`;
  return `${Math.floor(hoursSinceVisit / 24)}天前访问`;
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}

async function loadData() {
  try {
    loading.value = true;
    interviews.value = await fetchInterviews();
  } catch {
    showToast('加载数据失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  try {
    const newInterview = await createInterview(addForm.value.company, addForm.value.position, addForm.value.url || undefined);
    interviews.value.unshift(newInterview);
    showAddModal.value = false;
    addForm.value = { company: '', position: '', url: '' };
    showToast('添加成功');
  } catch {
    showToast('添加失败', 'error');
  }
}

function editInterview(item: Interview) {
  editTarget.value = item;
  editForm.value = { company: item.company, position: item.position, url: item.url || '' };
  showEditModal.value = true;
}

async function handleEdit() {
  if (!editTarget.value) return;
  try {
    const updated = await updateInterview(editTarget.value.id, editForm.value.company, editForm.value.position, editForm.value.url || undefined);
    const idx = interviews.value.findIndex(i => i.id === updated.id);
    if (idx !== -1) interviews.value[idx] = updated;
    showEditModal.value = false;
    showToast('修改成功');
  } catch {
    showToast('修改失败', 'error');
  }
}

function confirmDelete(item: Interview) {
  deleteTarget.value = item;
  showDeleteDialog.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  try {
    await deleteInterview(deleteTarget.value.id);
    interviews.value = interviews.value.filter(i => i.id !== deleteTarget.value!.id);
    showDeleteDialog.value = false;
    showToast('已删除');
  } catch {
    showToast('删除失败', 'error');
  }
}

function openStageMenu(interviewId: string, stageIndex: number, event: MouseEvent) {
  stageMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    interviewId,
    stageIndex
  };
}

async function updateStageStatus(status: string) {
  const { interviewId, stageIndex } = stageMenu.value;
  stageMenu.value.visible = false;

  try {
    const updated = await updateStage(interviewId, stageIndex, status);
    const idx = interviews.value.findIndex(i => i.id === interviewId);
    if (idx !== -1) interviews.value[idx] = updated;
    showToast('状态已更新');
  } catch {
    showToast('更新失败', 'error');
  }
}

async function handleExport() {
  try {
    const data = await exportInterviews();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interviews-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功');
  } catch {
    showToast('导出失败', 'error');
  }
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  try {
    const text = await input.files[0].text();
    const data = JSON.parse(text);
    const result = await importInterviews(data);
    if (result.count > 0) {
      await loadData();
      showToast(`成功导入 ${result.count} 条记录`);
    } else {
      showToast('没有新记录需要导入', 'info');
    }
  } catch {
    showToast('导入失败', 'error');
  }

  input.value = '';
}

function closeStageMenu() {
  stageMenu.value.visible = false;
}

async function handleVisit(item: Interview) {
  if (!item.url) return;

  // 在新标签页打开链接
  window.open(item.url, '_blank');

  // 记录访问时间
  try {
    const result = await recordVisit(item.id);
    const idx = interviews.value.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      interviews.value[idx] = { ...interviews.value[idx], lastVisitedAt: result.lastVisitedAt };
    }
  } catch {
    // 静默失败，不影响用户体验
  }
}

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) user.value = JSON.parse(userStr);
  loadData();
  document.addEventListener('click', closeStageMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeStageMenu);
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== 顶栏：毛玻璃吸顶 ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background: var(--color-surface);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.admin-link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.admin-link:hover {
  text-decoration: underline;
}

.logout-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
}

.logout-btn:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-box input {
  padding: 10px 16px 10px 34px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  font-size: 14px;
  width: 300px;
  background: var(--color-surface-solid);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sort-select {
  padding: 10px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--color-surface-solid);
  color: var(--color-text);
}

.btn {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.btn-secondary {
  background: var(--color-surface-solid);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-strong);
}

.btn-secondary:hover {
  color: var(--color-text);
  border-color: var(--color-text-tertiary);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* ===== 空态与加载 ===== */
.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-tertiary);
}

/* ===== 卡片列表 ===== */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: var(--color-surface-solid);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out), border-left-color var(--duration-normal) var(--ease-out);
  border-left: 4px solid transparent;
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 访问状态颜色标记 */
.card.visit-fresh { border-left-color: var(--color-success); }

.card.visit-normal { border-left-color: #ecc94b; }

.card.visit-warning { border-left-color: #ed8936; }

.card.visit-danger { border-left-color: var(--color-danger); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.card-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-company {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-company.has-url {
  cursor: pointer;
  color: var(--color-accent);
}

.card-company.has-url:hover {
  text-decoration: underline;
}

.url-icon {
  font-size: 14px;
  opacity: 0.7;
}

.card-company.has-url:hover .url-icon {
  opacity: 1;
}

.card-position {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 3px 12px;
  border-radius: var(--radius-full);
}

.card-date {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-icon {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-icon:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
  background: var(--color-bg);
}

.btn-icon.btn-danger:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

/* ===== 时间线：连接线 + 状态符号 + 当前阶段脉冲 ===== */
.card-timeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding: 10px 0 4px;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  position: relative;
}

/* 节点之间的连接线：本节点已通过则用绿色，表示流程已推进 */
.timeline-node:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 8px;
  left: calc(50% + 10px);
  right: calc(-50% + 10px);
  height: 2px;
  background: var(--color-connector);
  border-radius: 1px;
}

.timeline-node.status-pass:not(:last-child)::before {
  background: var(--color-connector-pass);
}

.timeline-node.clickable {
  cursor: pointer;
}

.node-dot {
  position: relative;
  z-index: 1;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-surface-solid);
  border: 2px solid var(--color-pending-border);
  margin-bottom: 8px;
  transition: transform var(--duration-fast) var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.timeline-node.clickable:hover .node-dot {
  transform: scale(1.2);
}

/* 阶段状态符号 */
.node-dot::after {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: white;
}

.status-pass .node-dot {
  background: var(--color-success);
  border-color: var(--color-success);
}

.status-pass .node-dot::after {
  content: '✓';
}

.status-fail .node-dot {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.status-fail .node-dot::after {
  content: '✗';
}

.status-rejected .node-dot {
  background: var(--color-gray);
  border-color: var(--color-gray);
}

.status-rejected .node-dot::after {
  content: '×';
}

.status-skip .node-dot {
  background: var(--color-gray-soft);
  border-color: var(--color-border-strong);
}

/* 当前阶段：主题色实心 + 脉冲光圈 */
.status-current .node-dot {
  background: var(--color-accent);
  border-color: var(--color-accent);
  animation: pulse-ring 2s var(--ease-out) infinite;
}

.timeline-node.clickable:hover .node-dot {
  animation-play-state: paused;
}

.node-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
}

.status-current .node-label {
  color: var(--color-accent);
  font-weight: 600;
}

.status-pass .node-label {
  color: var(--color-success);
}

.status-fail .node-label {
  color: var(--color-danger);
}

.status-rejected .node-label {
  color: var(--color-text-tertiary);
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--backdrop-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-modal);
  animation: scale-in var(--duration-normal) var(--ease-out);
}

.modal h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: var(--color-text);
}

.modal-small p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
}

.modal .form-group {
  margin-bottom: 16px;
}

.modal .form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--color-text);
}

.modal .form-group .optional {
  font-weight: 400;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.modal .form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  box-sizing: border-box;
  background: var(--color-surface-solid);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.modal .form-group input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

/* ===== 阶段操作菜单 ===== */
.stage-menu {
  position: fixed;
  background: var(--color-surface-solid);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-popover);
  z-index: 1000;
  overflow: hidden;
  animation: scale-in var(--duration-fast) var(--ease-out);
}

.stage-menu button {
  display: block;
  width: 100%;
  padding: 10px 20px;
  text-align: left;
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.stage-menu button:hover {
  background: var(--color-bg);
}

/* ===== 轻提示 ===== */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: white;
  z-index: 2000;
  animation: slide-up var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-popover);
}

.toast.success {
  background: var(--color-success);
}

.toast.error {
  background: var(--color-danger);
}

.toast.info {
  background: var(--color-accent);
}

@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box input {
    width: 100%;
  }

  .toolbar-actions {
    flex-wrap: wrap;
  }

  .card-timeline {
    overflow-x: auto;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
