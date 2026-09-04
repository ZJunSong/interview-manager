<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
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
      
      <div v-else-if="filteredInterviews.length === 0" class="empty">
        <p v-if="searchQuery">没有找到匹配的记录</p>
        <p v-else>还没有面试记录，点击"添加面试"开始</p>
      </div>
      
      <div v-else class="card-list">
        <div v-for="item in filteredInterviews" :key="item.id" class="card" :class="getVisitStatusClass(item)">
          <div class="card-header">
            <div class="card-info">
              <h2 class="card-company" :class="{ 'has-url': item.url }" @click="item.url && handleVisit(item)">
                {{ item.company }}
                <span v-if="item.url" class="url-icon" title="点击访问招聘页面">↗</span>
              </h2>
              <span class="card-position">{{ item.position }}</span>
            </div>
            <div class="card-actions">
              <button class="btn-icon" @click="editInterview(item)">编辑</button>
              <button class="btn-icon btn-danger" @click="confirmDelete(item)">删除</button>
            </div>
          </div>
          
          <div class="card-timeline">
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
  background: #f5f5f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: #666;
}

.admin-link {
  font-size: 13px;
  color: #667eea;
  text-decoration: none;
}

.logout-btn {
  padding: 6px 12px;
  font-size: 13px;
  color: #666;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #f0f0f0;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.search-box input {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  width: 300px;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sort-select {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd6;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}

.btn-icon {
  padding: 6px 12px;
  font-size: 13px;
  color: #666;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-icon:hover {
  background: #f0f0f0;
}

.btn-icon.btn-danger:hover {
  color: #e53e3e;
  background: #fff5f5;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #999;
}

.empty {
  text-align: center;
  padding: 60px;
  color: #999;
  background: white;
  border-radius: 12px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-left 0.3s ease;
  border-left: 4px solid transparent;
}

/* 访问状态颜色标记 */
.card.visit-fresh {
  border-left-color: #38a169;
}

.card.visit-normal {
  border-left-color: #ecc94b;
}

.card.visit-warning {
  border-left-color: #ed8936;
}

.card.visit-danger {
  border-left-color: #e53e3e;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-company {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-company.has-url {
  cursor: pointer;
  color: #667eea;
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
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-timeline {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  padding: 8px 0;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  position: relative;
}

.timeline-node.clickable {
  cursor: pointer;
}

.timeline-node.clickable:hover .node-dot {
  transform: scale(1.3);
}

.node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e0e0e0;
  margin-bottom: 6px;
  transition: transform 0.2s;
}

.node-label {
  font-size: 11px;
  color: #999;
  text-align: center;
}

.status-current .node-dot {
  background: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.status-current .node-label {
  color: #667eea;
  font-weight: 600;
}

.status-pass .node-dot {
  background: #38a169;
}

.status-pass .node-label {
  color: #38a169;
}

.status-fail .node-dot {
  background: #e53e3e;
}

.status-fail .node-label {
  color: #e53e3e;
}

.status-rejected .node-dot {
  background: #999;
}

.status-skip .node-dot {
  background: #cbd5e0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
}

.modal-small p {
  color: #666;
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
}

.modal .form-group .optional {
  font-weight: 400;
  color: #999;
  font-size: 12px;
}

.modal .form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.stage-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.stage-menu button {
  display: block;
  width: 100%;
  padding: 10px 20px;
  text-align: left;
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
}

.stage-menu button:hover {
  background: #f5f5f5;
}

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: white;
  z-index: 2000;
  animation: slideIn 0.3s ease;
}

.toast.success {
  background: #38a169;
}

.toast.error {
  background: #e53e3e;
}

.toast.info {
  background: #667eea;
}

@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
}
</style>
