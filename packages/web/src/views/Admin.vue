<template>
  <div class="admin-page">
    <header class="header">
      <div class="header-left">
        <span class="logo-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#1c1917"/>
            <circle cx="16" cy="13" r="5" stroke="#fff" stroke-width="2"/>
            <path d="M6 25c0-4 4-7 10-7s10 3 10 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <h1 class="logo">管理后台</h1>
      </div>
      <div class="header-right">
        <router-link to="/dashboard" class="back-link">返回前台</router-link>
        <span class="user-info">{{ user?.username }} (管理员)</span>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">加载中...</div>

      <template v-else>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalInterviews }}</div>
            <div class="stat-label">总面试记录</div>
          </div>
          <div class="stat-card">
            <div class="stat-value stat-value-accent">{{ stats.activeInterviews }}</div>
            <div class="stat-label">进行中</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.recentUsers }}</div>
            <div class="stat-label">本周新增用户</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">用户管理</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>面试数</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td class="td-muted">{{ u.id }}</td>
                <td class="td-name">{{ u.username }}</td>
                <td>
                  <span :class="['role-badge', u.role]">{{ u.role === 'admin' ? '管理员' : '普通用户' }}</span>
                </td>
                <td class="td-num">{{ u.interviewCount || 0 }}</td>
                <td class="td-muted td-num">{{ formatDate(u.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button
                      v-if="u.id !== user?.id"
                      class="btn-icon"
                      @click="toggleRole(u)"
                    >
                      {{ u.role === 'admin' ? '设为用户' : '设为管理员' }}
                    </button>
                    <button
                      v-if="u.id !== user?.id"
                      class="btn-icon btn-danger"
                      @click="confirmDelete(u)"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </main>

    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="showDeleteDialog = false">
      <div class="modal modal-small">
        <h3>确认删除</h3>
        <p>确定要删除用户 {{ deleteTarget?.username }} 吗？该用户的所有面试记录也将被删除。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteDialog = false">取消</button>
          <button class="btn btn-danger" @click="handleDelete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { User } from '../types';
import { getUsers, deleteUser, updateUserRole, getStats } from '../api';

const router = useRouter();
const user = ref<any>(null);
const loading = ref(true);
const users = ref<User[]>([]);
const stats = ref({ totalUsers: 0, totalInterviews: 0, activeInterviews: 0, recentUsers: 0 });
const showDeleteDialog = ref(false);
const deleteTarget = ref<User | null>(null);
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 2000);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}

async function loadData() {
  try {
    loading.value = true;
    const [usersData, statsData] = await Promise.all([getUsers(), getStats()]);
    users.value = usersData.users;
    stats.value = statsData.stats;
  } catch {
    showToast('加载数据失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function toggleRole(u: User) {
  const newRole = u.role === 'admin' ? 'user' : 'admin';
  try {
    await updateUserRole(u.id, newRole);
    u.role = newRole;
    showToast('角色已更新');
  } catch {
    showToast('操作失败', 'error');
  }
}

function confirmDelete(u: User) {
  deleteTarget.value = u;
  showDeleteDialog.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  try {
    await deleteUser(deleteTarget.value.id);
    users.value = users.value.filter(u => u.id !== deleteTarget.value!.id);
    showDeleteDialog.value = false;
    showToast('用户已删除');
  } catch {
    showToast('删除失败', 'error');
  }
}

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) user.value = JSON.parse(userStr);
  loadData();
});
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== 顶栏：与控制台一致的毛玻璃吸顶 ===== */
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

.back-link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  transition: background var(--duration-fast) var(--ease-out);
}

.back-link:hover {
  background: var(--color-accent-soft);
}

.user-info {
  font-size: 14px;
  color: var(--color-text-secondary);
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

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-tertiary);
}

/* ===== 统计卡 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  text-align: center;
  box-shadow: var(--shadow-card);
  animation: fade-in var(--duration-normal) var(--ease-out);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.stat-value-accent {
  color: var(--color-accent);
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ===== 用户表格 ===== */
.section {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  box-shadow: var(--shadow-card);
  animation: fade-in var(--duration-normal) var(--ease-out);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr {
  transition: background var(--duration-fast) var(--ease-out);
}

.data-table tbody tr:hover {
  background: var(--color-bg);
}

.data-table th {
  font-weight: 500;
  color: var(--color-text-tertiary);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.data-table td {
  font-size: 14px;
}

.td-muted {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.td-name {
  font-weight: 600;
}

.td-num {
  font-variant-numeric: tabular-nums;
}

.role-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.role-badge.admin {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.role-badge.user {
  background: var(--color-gray-soft);
  color: var(--color-text-secondary);
}

.row-actions {
  display: flex;
  gap: 6px;
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

.btn-icon:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.btn-icon.btn-danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

/* ===== 弹窗与轻提示 ===== */
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
  border: 1px solid var(--color-border);
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-modal);
  animation: scale-in var(--duration-normal) var(--ease-out);
}

.modal h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--color-text);
}

.modal-small p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--duration-fast) var(--ease-out);
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
  background: #b91c1c;
}

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

.toast.success { background: var(--color-success); }
.toast.error { background: var(--color-danger); }

@media (max-width: 768px) {
  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
