<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <span class="logo-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="var(--color-ink)"/>
            <circle cx="16" cy="13" r="5" stroke="var(--color-on-ink)" stroke-width="2"/>
            <path d="M6 25c0-4 4-7 10-7s10 3 10 7" stroke="var(--color-on-ink)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <h1 class="logo">面试记录管理器</h1>
      </div>
      <div class="header-right">
        <ThemeToggle />
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
            <option value="progress">按进度</option>
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
            <option value="company">按公司名</option>
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

      <div v-if="loading" class="skeleton-list" aria-label="加载中">
        <div v-for="n in 3" :key="n" class="skeleton-card">
          <div class="sk-header">
            <div class="sk-block sk-title"></div>
            <div class="sk-block sk-chip"></div>
          </div>
          <div class="sk-timeline">
            <div v-for="d in 10" :key="d" class="sk-block sk-dot"></div>
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="filteredInterviews.length === 0"
        :is-search="!!searchQuery"
      />

      <div v-else class="card-list">
        <div
          v-for="group in companyGroups"
          :key="group.company"
          class="card"
          :class="{ pinned: group.pinned }"
          :data-company="group.company"
        >
          <div class="card-header">
            <div class="card-info">
              <h2
                class="card-company"
                :class="{ 'has-url': group.url }"
                :title="group.url ? '点击打开投递记录页面，该公司全部岗位标记为已访问' : ''"
                @click="group.url && handleVisitCompany(group)"
              >
                {{ group.company }}
              </h2>
              <span class="card-count">{{ group.items.length }} 个岗位</span>
            </div>
            <div class="card-right">
              <span
                v-if="group.url && !isGroupTerminated(group)"
                class="visit-badge"
                :class="group.latestVisit ? getVisitStatusClass(group.latestVisit) : 'visit-never'"
              >
                <span class="visit-dot"></span>{{ group.latestVisit ? getVisitStatusLabel(group.latestVisit) : '未访问' }}
              </span>
              <button
                class="btn-icon add-pos-btn"
                title="为该公司新增岗位，自动带上公司名和投递记录页链接"
                @click="openAddForCompany(group)"
              >
                新增岗位
              </button>
              <button
                class="btn-icon pin-btn"
                :class="{ 'pin-active': group.pinned }"
                :title="group.pinned ? '取消置顶' : '置顶该公司，固定显示在最前'"
                @click="togglePin(group)"
              >
                {{ group.pinned ? '已置顶' : '置顶' }}
              </button>
            </div>
          </div>

          <div v-for="item in group.items" :key="item.id" class="position-row">
            <div class="position-meta">
              <div class="position-line">
                <span class="card-position">{{ item.position }}</span>
                <span v-if="isInterviewTerminated(item)" class="dead-badge">已挂</span>
              </div>
              <span class="card-date">{{ (item.createdAt || '').slice(0, 10) }}</span>
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

            <div class="row-actions">
              <button class="btn-icon" @click="editInterview(item)">编辑</button>
              <button class="btn-icon btn-danger" @click="confirmDelete(item)">删除</button>
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
            <label>投递记录页面链接 <span class="optional">（选填，可在卡片一键跳转，同公司共用）</span></label>
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
            <label>投递记录页面链接 <span class="optional">（选填，可在卡片一键跳转，同公司共用）</span></label>
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
        <p>确定要删除 {{ deleteTarget?.company }} 的 {{ deleteTarget?.position }} 面试记录吗？</p>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Interview } from '../types';
import { fetchInterviews, createInterview, updateStage, deleteInterview, updateInterview, exportInterviews, importInterviews, visitCompany, pinCompany } from '../api';
import { filterInterviews, groupByCompany, sortGroups, isInterviewTerminated, isGroupTerminated, type CompanyGroup, type SortMode } from '../utils/grouping';
import StatsPanel from '../components/StatsPanel.vue';
import EmptyState from '../components/EmptyState.vue';
import ThemeToggle from '../components/ThemeToggle.vue';

const router = useRouter();
const user = ref<any>(null);
const loading = ref(true);
const interviews = ref<Interview[]>([]);
const searchQuery = ref('');
// 默认按进度排序：每次打开页面都以此为初始排序
const sortBy = ref<SortMode>('progress');

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

// 搜索过滤（记录级：命中公司名或职位名的记录才会出现在卡片里）
const filteredInterviews = computed(() => filterInterviews(interviews.value, searchQuery.value));

// 公司显示顺序快照：只在页面加载/切换排序/添加与编辑记录时重算。
// 修改阶段状态不重算顺序，防止卡片突然跳动（页面刷新后按最新进度重新排序）
const orderedKeys = ref<string[]>([]);

function recomputeOrder() {
  orderedKeys.value = sortGroups(groupByCompany(interviews.value), sortBy.value).map(g => g.company);
}

watch(sortBy, recomputeOrder);

// 公司聚合：顺序取自快照，新出现的公司排在末尾兜底；卡片组内顺序实时（挂了的岗位沉到卡片底部）
const companyGroups = computed(() => {
  const groups = groupByCompany(filteredInterviews.value);
  const rank = new Map(orderedKeys.value.map((c, i) => [c, i]));
  return groups.sort((a, b) => {
    const ra = rank.get(a.company) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.company) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb || (a.company < b.company ? -1 : 1);
  });
});

// 滚动到指定公司的卡片（添加/编辑后定位，免去手动滑动）
function scrollToCompany(company: string) {
  nextTick(() => {
    document.querySelector(`[data-company="${CSS.escape(company)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function getVisitStatusClass(lastVisitedAt?: string): string {
  if (!lastVisitedAt) return '';

  const lastVisit = new Date(lastVisitedAt).getTime();
  const hoursSinceVisit = (Date.now() - lastVisit) / (1000 * 60 * 60);

  // 阈值放宽：<8h 绿、8-24h 黄、24-48h 橙、超过两天红
  if (hoursSinceVisit < 8) return 'visit-fresh';
  if (hoursSinceVisit < 24) return 'visit-normal';
  if (hoursSinceVisit < 48) return 'visit-warning';
  return 'visit-danger';
}

function getVisitStatusLabel(lastVisitedAt?: string): string {
  if (!lastVisitedAt) return '';

  const lastVisit = new Date(lastVisitedAt).getTime();
  const hoursSinceVisit = (Date.now() - lastVisit) / (1000 * 60 * 60);

  if (hoursSinceVisit < 1) return '刚刚访问';
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
    recomputeOrder();
  } catch {
    showToast('加载数据失败', 'error');
  } finally {
    loading.value = false;
  }
}

// 从公司卡片发起新增：预填公司名与投递记录页链接，避免手打公司名不一致导致无法聚合到同一公司
function openAddForCompany(group: CompanyGroup) {
  addForm.value = { company: group.company, position: '', url: group.url || '' };
  showAddModal.value = true;
}

async function handleAdd() {
  const company = addForm.value.company.trim();
  try {
    const newInterview = await createInterview(addForm.value.company, addForm.value.position, addForm.value.url || undefined);
    interviews.value.unshift(newInterview);
    showAddModal.value = false;
    addForm.value = { company: '', position: '', url: '' };

    // 添加即视为一次访问：用户通常正浏览该公司招聘页时录入，公司维度刷新访问时间，
    // 新卡片立即显示"刚刚访问"而非"未访问"
    try {
      const visit = await visitCompany(company);
      interviews.value = interviews.value.map(i =>
        i.company.trim() === company ? { ...i, lastVisitedAt: visit.lastVisitedAt } : i
      );
    } catch {
      // 访问标记失败不影响添加结果
    }

    // 新公司进入排序快照并滚动定位到它的卡片
    recomputeOrder();
    scrollToCompany(company);
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
    // 公司名可能被修改，重算顺序并定位到所属卡片
    recomputeOrder();
    scrollToCompany(updated.company);
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
  // 阻止冒泡：否则同一点击会立即传到 document 上的关闭监听，菜单开了又关，表现为点击无效
  event.stopPropagation();
  // 菜单约 170×110px：靠近视口底部时向上弹出，靠近右缘时向左弹出，避免被裁剪
  const MENU_H = 170;
  const MENU_W = 110;
  const flipUp = event.clientY + MENU_H > window.innerHeight;
  const flipLeft = event.clientX + MENU_W > window.innerWidth;
  stageMenu.value = {
    visible: true,
    x: flipLeft ? event.clientX - MENU_W : event.clientX,
    y: flipUp ? event.clientY - MENU_H : event.clientY,
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
    // 字段合并而非整体替换：接口未返回的字段（如 url）保留原值，避免跳转链接失效
    if (idx !== -1) interviews.value[idx] = { ...interviews.value[idx], ...updated };
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

// 公司维度置顶/取消置顶：置顶公司固定在列表最前，不参与排序也不受全挂沉底影响
async function togglePin(group: CompanyGroup) {
  const target = !group.pinned;
  try {
    await pinCompany(group.company, target);
    interviews.value = interviews.value.map(i =>
      i.company.trim() === group.company ? { ...i, pinned: target } : i
    );
    // 置顶是主动操作，立即重算顺序让卡片移动到目标位置（置顶到最前/取消后回归排序位置）
    recomputeOrder();
    showToast(target ? '已置顶' : '已取消置顶');
  } catch {
    showToast('操作失败', 'error');
  }
}

// 以公司为基准访问：打开该公司的投递记录页面（优先取最近访问过的岗位的链接），
// 公司下所有岗位记录一次性标记为已访问
async function handleVisitCompany(group: CompanyGroup) {
  if (!group.url) return;

  window.open(group.url, '_blank');

  try {
    const result = await visitCompany(group.company);
    interviews.value = interviews.value.map(i =>
      i.company.trim() === group.company ? { ...i, lastVisitedAt: result.lastVisitedAt } : i
    );
  } catch {
    // 静默失败，不影响跳转体验
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
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.02em;
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
  padding: 5px 12px;
  border-radius: var(--radius-full);
  transition: background var(--duration-fast) var(--ease-out);
}

.admin-link:hover {
  background: var(--color-accent-soft);
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
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.btn-primary:hover {
  background: var(--color-ink-hover);
  box-shadow: var(--shadow-button);
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
  color: var(--color-on-status);
}

.btn-danger:hover {
  background: var(--color-danger-hover);
}

/* ===== 骨架屏加载态 ===== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  padding: 18px 22px 14px;
  box-shadow: var(--shadow-card);
}

.sk-block {
  border-radius: var(--radius-sm);
  background: linear-gradient(
    100deg,
    var(--color-bg-deep) 40%,
    var(--color-shimmer) 50%,
    var(--color-bg-deep) 60%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

.sk-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.sk-title {
  width: 140px;
  height: 20px;
}

.sk-chip {
  width: 72px;
  height: 18px;
  border-radius: var(--radius-full);
}

.sk-timeline {
  display: flex;
  justify-content: space-between;
  padding: 2px 8px 8px;
}

.sk-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

/* ===== 卡片列表 ===== */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  padding: 18px 22px;
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out);
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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
  color: var(--color-accent-strong);
  text-decoration: underline;
  text-decoration-color: var(--color-accent-border);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
  transition: text-decoration-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.card-company.has-url:hover {
  color: var(--color-accent);
  text-decoration-color: currentColor;
}

.card-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 2px 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
}

.card-date {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.visit-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.visit-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.visit-badge.visit-fresh {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.visit-badge.visit-normal {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.visit-badge.visit-warning {
  color: var(--color-orange);
  background: var(--color-orange-soft);
}

.visit-badge.visit-danger {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.visit-badge.visit-never {
  color: var(--color-text-tertiary);
  background: var(--color-gray-soft);
}

/* ===== 岗位行：公司卡片内的每条记录（单条与多条完全同构） ===== */
.position-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 7px 0;
}

.position-row + .position-row {
  border-top: 1px dashed var(--color-border);
}

.position-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 120px;
  flex-shrink: 0;
}

.position-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.card-position {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border-strong);
  padding: 3px 12px;
  border-radius: var(--radius-full);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已挂标签：描边红，与岗位标签同构 */
.dead-badge {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-danger);
  background: var(--color-surface-solid);
  border: 1px solid var(--color-danger-border);
}

.card-timeline {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding: 6px 0 2px;
}

.row-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.card:hover .row-actions {
  opacity: 1;
}

@media (hover: none) {
  .row-actions {
    opacity: 1;
  }
}

.btn-icon {
  padding: 5px 10px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

/* 置顶按钮：贴右缘固定宽度对齐；未置顶时 hover 卡片才浮现，已置顶常显为主题色文字 */
.pin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  opacity: 0;
}

.card:hover .pin-btn,
.pin-btn.pin-active {
  opacity: 1;
}

@media (hover: none) {
  .pin-btn {
    opacity: 1;
  }
}

.add-pos-btn {
  opacity: 0;
}

.card:hover .add-pos-btn {
  opacity: 1;
}

@media (hover: none) {
  .add-pos-btn {
    opacity: 1;
  }
}

.pin-btn.pin-active {
  color: var(--color-accent);
  font-weight: 600;
}

.pin-btn.pin-active:hover {
  background: var(--color-accent-soft);
}

.pin-btn.pin-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

/* 置顶卡片：主题色细边框 + 顶部淡蓝晕染底，不用图标靠卡片本身区分 */
.card.pinned {
  border: 1px solid var(--color-accent-border);
  background: linear-gradient(180deg, var(--color-pinned-highlight), transparent 42%), var(--color-surface-solid);
}

.btn-icon:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.btn-icon.btn-danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

/* ===== 时间线：连接线 + 状态符号 + 当前阶段脉冲 ===== */
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
  margin-bottom: 5px;
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
  color: var(--color-on-status);
}

.status-pass .node-dot {
  background: var(--color-connector-pass);
  border-color: var(--color-connector-pass);
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
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
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
  color: var(--color-on-status);
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
  .header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 16px;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 10px;
    margin-left: auto;
  }

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

  .position-row {
    flex-wrap: wrap;
  }

  .row-actions {
    margin-left: auto;
  }
}
</style>
