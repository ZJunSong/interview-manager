<template>
  <div class="admin-page">
    <header class="header">
      <div class="header-left">
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
            <div class="stat-value">{{ stats.activeInterviews }}</div>
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
                <td>{{ u.id }}</td>
                <td>{{ u.username }}</td>
                <td>
                  <span :class="['role-badge', u.role]">{{ u.role === 'admin' ? '管理员' : '普通用户' }}</span>
                </td>
                <td>{{ u.interviewCount || 0 }}</td>
                <td>{{ formatDate(u.createdAt) }}</td>
                <td>
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

.back-link {
  font-size: 14px;
  color: #667eea;
  text-decoration: none;
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
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #999;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #999;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.data-table th {
  font-weight: 600;
  color: #666;
  font-size: 13px;
}

.data-table td {
  font-size: 14px;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.admin {
  background: #eef2ff;
  color: #667eea;
}

.role-badge.user {
  background: #f0f0f0;
  color: #666;
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
}

.modal h3 {
  margin: 0 0 16px 0;
}

.modal-small p {
  color: #666;
  font-size: 14px;
  margin: 0 0 20px 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-danger {
  background: #e53e3e;
  color: white;
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
}

.toast.success { background: #38a169; }
.toast.error { background: #e53e3e; }

@media (max-width: 768px) {
  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
