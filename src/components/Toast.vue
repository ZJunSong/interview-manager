<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="toast"
        :class="msg.type"
      >
        <span class="toast-icon">{{ msg.type === 'success' ? '✓' : '✕' }}</span>
        <span class="toast-text">{{ msg.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { ToastMessage } from '../types';

defineProps<{
  messages: ToastMessage[];
}>();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: var(--backdrop-blur);
  box-shadow: var(--shadow-card);
  pointer-events: auto;
  white-space: nowrap;
}

.toast.success {
  background: rgba(34, 197, 94, 0.92);
  color: #fff;
}

.toast.error {
  background: rgba(239, 68, 68, 0.92);
  color: #fff;
}

.toast-icon {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.toast-enter-active {
  animation: toast-in var(--duration-normal) var(--ease-spring);
}

.toast-leave-active {
  animation: toast-out var(--duration-fast) var(--ease-out) forwards;
}
</style>
