<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-msg" style="width: 360px">
        <p id="confirm-dialog-msg" class="dialog-message">
          确定要删除「<strong>{{ companyName }}</strong>」的面试记录吗？此操作不可撤销。
        </p>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="$emit('cancel')">取消</button>
          <button type="button" class="btn-delete" @click="$emit('confirm')">删除</button>
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
@import '../assets/styles/modal.css';

.dialog-message {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text);
}

.dialog-message strong {
  font-weight: 600;
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
