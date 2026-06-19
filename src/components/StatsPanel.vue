<template>
  <div class="stats" role="group" aria-label="面试统计概览">
    <div class="stat-item">
      <span class="stat-value">{{ interviews.length }}</span>
      <span class="stat-label">总记录</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value accent">{{ activeCount }}</span>
      <span class="stat-label">进行中</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value success">{{ passCount }}</span>
      <span class="stat-label">已通过</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value danger">{{ failCount }}</span>
      <span class="stat-label">未通过</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item stat-progress-item">
      <div class="stat-progress-wrap">
        <span class="stat-value">{{ avgProgress }}<span class="stat-unit">/10</span></span>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>
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

const progressPct = computed(() => {
  if (props.interviews.length === 0) return 0;
  const total = props.interviews.reduce((sum, i) => {
    return sum + i.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
  }, 0);
  return Math.round((total / (props.interviews.length * 10)) * 100);
});
</script>

<style scoped>
.stats {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-xl);
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

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--color-border);
  flex-shrink: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  margin-left: 1px;
}

.stat-value.accent { color: var(--color-accent); }
.stat-value.success { color: var(--color-success); }
.stat-value.danger { color: var(--color-danger); }

.stat-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

/* 平均进度项：数值 + 进度条 */
.stat-progress-item {
  flex: 1.4;
}

.stat-progress-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
}

.stat-progress-track {
  width: 100%;
  max-width: 80px;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stat-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}

@media (max-width: 600px) {
  .stats {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-md);
  }
  .stat-divider {
    display: none;
  }
  .stat-item {
    flex: 0 0 calc(33% - var(--space-sm));
  }
  .stat-progress-item {
    flex: 0 0 100%;
  }
}
</style>
