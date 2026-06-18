<template>
  <div class="stats">
    <div class="stat-item">
      <span class="stat-value">{{ interviews.length }}</span>
      <span class="stat-label">总记录</span>
    </div>
    <div class="stat-item">
      <span class="stat-value accent">{{ activeCount }}</span>
      <span class="stat-label">进行中</span>
    </div>
    <div class="stat-item">
      <span class="stat-value success">{{ passCount }}</span>
      <span class="stat-label">已通过</span>
    </div>
    <div class="stat-item">
      <span class="stat-value danger">{{ failCount }}</span>
      <span class="stat-label">未通过</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{{ avgProgress }}</span>
      <span class="stat-label">平均进度</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Interview } from '../types';

const props = defineProps<{
  interviews: Interview[];
}>();

const activeCount = computed(() =>
  props.interviews.filter(i => i.stages.some(s => s.status === 'current')).length
);

const passCount = computed(() =>
  props.interviews.filter(i => i.stages.some(s => s.status === 'pass' || s.status === 'skip')).length
);

const failCount = computed(() =>
  props.interviews.filter(i => i.stages.some(s => s.status === 'fail' || s.status === 'rejected')).length
);

const avgProgress = computed(() => {
  if (props.interviews.length === 0) return '0';
  const total = props.interviews.reduce((sum, i) => {
    return sum + i.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
  }, 0);
  return (total / props.interviews.length).toFixed(1);
});
</script>

<style scoped>
.stats {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  backdrop-filter: var(--backdrop-blur);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  animation: fade-in var(--duration-normal) var(--ease-out);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-value.accent { color: var(--color-accent); }
.stat-value.success { color: var(--color-success); }
.stat-value.danger { color: var(--color-danger); }

.stat-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

@media (max-width: 600px) {
  .stats {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .stat-item {
    flex: 0 0 calc(33% - var(--space-sm));
  }
}
</style>
