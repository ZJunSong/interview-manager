<template>
  <div class="stats" role="group" aria-label="求职进度概览">
    <div class="stat-item">
      <span class="stat-value">{{ totalCount }}</span>
      <span class="stat-label">投递总数</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value accent">{{ activeCount }}</span>
      <span class="stat-label">进行中</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value success">{{ offerCount }}</span>
      <span class="stat-label">Offer</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item">
      <span class="stat-value danger">{{ rejectedCount }}</span>
      <span class="stat-label">已拒绝</span>
    </div>
    <span class="stat-divider"></span>
    <div class="stat-item stat-rate">
      <span class="stat-value">{{ interviewRate }}<span class="stat-unit">%</span></span>
      <span class="stat-label">面试转化率</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Interview } from '../types';

const props = defineProps<{
  interviews: Interview[];
}>();

// 投递总数
const totalCount = computed(() => props.interviews.length);

// 进行中：存在 current 阶段且未拿到 offer、未被拒
const activeCount = computed(() =>
  props.interviews.filter(i =>
    i.stages.some(s => s.status === 'current') &&
    !hasOffer(i) &&
    !isRejected(i)
  ).length
);

// Offer 数：最后一个阶段（正式offer）状态为 pass
function hasOffer(i: Interview): boolean {
  const last = i.stages[i.stages.length - 1];
  return last?.status === 'pass';
}
const offerCount = computed(() => props.interviews.filter(hasOffer).length);

// 已拒绝：任意阶段为 rejected
function isRejected(i: Interview): boolean {
  return i.stages.some(s => s.status === 'rejected');
}
const rejectedCount = computed(() => props.interviews.filter(isRejected).length);

// 面试转化率：进入面试阶段（一面=索引4及以后有 pass/current）的占比
const interviewRate = computed(() => {
  if (totalCount.value === 0) return '0';
  const entered = props.interviews.filter(i =>
    i.stages.slice(4).some(s => s.status === 'pass' || s.status === 'current')
  ).length;
  return Math.round((entered / totalCount.value) * 100);
});
</script>

<style scoped>
.stats {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
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
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 14px;
  font-weight: 600;
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
  margin-top: 2px;
}

.stat-rate {
  flex: 1.1;
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
}
</style>
