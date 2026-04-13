<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('cancel')">
      <div class="dialog">
        <p class="dialog-message">
          确定要删除「<strong>{{ companyName }}</strong>」的面试记录吗？此操作不可撤销。
        </p>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="$emit('cancel')">取消</button>
          <button class="btn-delete" @click="$emit('confirm')">删除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  companyName: string;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 250;
  background: var(--backdrop-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in var(--duration-fast) var(--ease-out);
}

.dialog {
  background: var(--color-surface-solid);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: var(--space-xl);
  width: 360px;
  max-width: 90vw;
  animation: scale-in var(--duration-normal) var(--ease-spring);
}

.dialog-message {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text);
}

.dialog-message strong {
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-cancel:hover {
  background: var(--color-bg);
}

.btn-delete {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  background: var(--color-danger);
  color: #fff;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-delete:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}
</style>
