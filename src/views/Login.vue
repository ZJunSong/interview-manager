<template>
  <div class="auth-page">
    <div class="auth-bg" aria-hidden="true"></div>
    <div class="auth-card">
      <div class="auth-brand">
        <span class="auth-mark">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1c1917"/>
            <circle cx="16" cy="13" r="5" stroke="#fff" stroke-width="2"/>
            <path d="M6 25c0-4 4-7 10-7s10 3 10 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <h1 class="auth-title">面试记录管理器</h1>
        <p class="auth-subtitle">登录以管理你的面试数据</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="auth-button" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>还没有账号？ <router-link to="/register">立即注册</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    const data = await login(username.value.trim(), password.value);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/dashboard');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰背景：暖纸上的两团柔光 */
.auth-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(560px 420px at 12% 0%, rgba(37, 99, 235, 0.10), transparent 60%),
    radial-gradient(640px 480px at 96% 100%, rgba(180, 83, 9, 0.08), transparent 60%),
    var(--color-bg);
}

.auth-card {
  position: relative;
  background: var(--color-surface-solid);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  padding: 44px 40px 32px;
  width: 100%;
  max-width: 410px;
  box-shadow: var(--shadow-modal);
  animation: scale-in var(--duration-normal) var(--ease-out);
}

.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 32px;
}

.auth-mark {
  display: inline-flex;
  margin-bottom: 14px;
}

.auth-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text);
  margin: 0 0 6px 0;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 11px 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  font-size: 15px;
  background: var(--color-surface-solid);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.form-group input::placeholder {
  color: var(--color-text-tertiary);
}

.form-group input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.error-message {
  color: var(--color-danger);
  font-size: 13px;
  text-align: center;
  padding: 10px 12px;
  background: var(--color-danger-soft);
  border-radius: var(--radius-sm);
}

.auth-button {
  margin-top: 4px;
  padding: 12px 24px;
  background: var(--color-ink);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.auth-button:hover:not(:disabled) {
  background: var(--color-ink-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(28, 25, 23, 0.18);
}

.auth-button:active:not(:disabled) {
  transform: translateY(0);
}

.auth-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.auth-footer a {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
