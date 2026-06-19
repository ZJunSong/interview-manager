<template>
  <div
    class="card"
    :class="cardTone"
    :style="{ animationDelay: `${index * 60}ms` }"
  >
    <div class="card-header">
      <div class="card-info">
        <h2 class="card-company">{{ interview.company }}</h2>
        <span class="card-position">{{ interview.position }}</span>
      </div>
      <div class="card-meta">
        <span class="card-date" :title="'创建: ' + formatDate(interview.createdAt)">{{ formatDate(interview.updatedAt || interview.createdAt) }}{{ interview.updatedAt !== interview.createdAt ? ' · 已编辑' : '' }}</span>
        <div class="card-actions">
          <button type="button" class="card-edit" @click="$emit('edit', interview.id)">编辑</button>
          <button type="button" class="card-delete" @click="$emit('delete', interview.id)">删除</button>
        </div>
      </div>
    </div>

    <div class="card-progress" v-if="progressPercent > 0">
      <div class="card-progress-bar" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <div class="card-timeline">
      <TimelineNode
        v-for="(stage, i) in interview.stages"
        :key="i"
        :stage="stage"
        :index="i"
        :is-last="i === interview.stages.length - 1"
        :connector-color="stage.status === 'pass' ? 'var(--color-connector-pass)' : stage.status === 'skip' ? 'var(--color-gray)' : 'var(--color-connector)'"
        @click="(idx, el) => $emit('stageClick', interview.id, idx, el)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Interview } from '../types';
import TimelineNode from './TimelineNode.vue';

const props = defineProps<{
  interview: Interview;
  index: number;
}>();

defineEmits<{
  stageClick: [interviewId: string, stageIndex: number, el: HTMLElement];
  delete: [interviewId: string];
  edit: [interviewId: string];
}>();

// 卡片整体色调：根据最末状态决定左侧色条
const cardTone = computed(() => {
  const stages = props.interview.stages;
  // 优先看是否被拒绝/未通过
  if (stages.some(s => s.status === 'rejected')) return 'tone-rejected';
  if (stages.some(s => s.status === 'fail')) return 'tone-fail';
  // 是否已拿到 offer（全部通过）
  if (stages.every(s => s.status === 'pass' || s.status === 'skip')) return 'tone-pass';
  if (stages.some(s => s.status === 'current')) return 'tone-current';
  return '';
});

const progressPercent = computed(() => {
  const done = props.interview.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
  return Math.round((done / props.interview.stages.length) * 100);
});

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}
</script>

<style scoped>
.card {
  position: relative;
  background: var(--color-surface);
  backdrop-filter: var(--backdrop-blur);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg) var(--space-xl);
  animation: slide-up var(--duration-slow) var(--ease-out) both;
  transition: box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out);
  /* 左侧预留色条空间 */
  padding-left: calc(var(--space-xl) + 4px);
  overflow: hidden;
}

/* 左侧状态色条 */
.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-border);
  transition: background var(--duration-normal) var(--ease-out);
}

.card.tone-current::before { background: var(--color-accent); }
.card.tone-pass::before { background: var(--color-success); }
.card.tone-fail::before { background: var(--color-danger); }
.card.tone-rejected::before { background: var(--color-danger); }

.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.card-company {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-position {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  letter-spacing: 0.01em;
  align-self: flex-start;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.card-date {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 400;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.card-edit {
  font-size: 13px;
  color: var(--color-text-tertiary);
  padding: 5px 12px;
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 400;
}

.card-edit:hover {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.card-edit:active {
  transform: scale(0.96);
}

.card-delete {
  font-size: 13px;
  color: var(--color-text-tertiary);
  padding: 5px 12px;
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 400;
}

.card-delete:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.card-delete:active {
  transform: scale(0.96);
}

.card-edit:focus-visible,
.card-delete:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  outline: none;
}

/* 进度条 */
.card-progress {
  height: 3px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-md);
  overflow: hidden;
}

.card-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}

.card-timeline {
  display: flex;
  align-items: center;
  padding: 0 var(--space-xs);
  padding-bottom: var(--space-2xl);
  overflow-x: auto;
  gap: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.card-timeline::-webkit-scrollbar {
  height: 6px;
}
.card-timeline::-webkit-scrollbar-track {
  background: transparent;
}
.card-timeline::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}
.card-timeline::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.card-timeline > :deep(.timeline-node) {
  padding-bottom: var(--space-sm);
}
</style>
