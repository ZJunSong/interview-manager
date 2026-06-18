<template>
  <div class="card" :style="{ animationDelay: `${index * 60}ms` }">
    <div class="card-header">
      <div class="card-info">
        <h2 class="card-company">{{ interview.company }}</h2>
        <span class="card-position">{{ interview.position }}</span>
        <span class="card-date" :title="'创建: ' + formatDate(interview.createdAt)">{{ formatDate(interview.updatedAt || interview.createdAt) }}{{ interview.updatedAt !== interview.createdAt ? ' (已编辑)' : '' }}</span>
      </div>
      <div class="card-actions">
        <button class="card-edit" @click="$emit('edit', interview.id)">编辑</button>
        <button class="card-delete" @click="$emit('delete', interview.id)">删除</button>
      </div>
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
import type { Interview } from '../types';
import TimelineNode from './TimelineNode.vue';

defineProps<{
  interview: Interview;
  index: number;
}>();

defineEmits<{
  stageClick: [interviewId: string, stageIndex: number, el: HTMLElement];
  delete: [interviewId: string];
  edit: [interviewId: string];
}>();

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
  background: var(--color-surface);
  backdrop-filter: var(--backdrop-blur);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-xl) var(--space-2xl);
  animation: slide-up var(--duration-slow) var(--ease-out) both;
  transition: box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out);
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.card-info {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.card-company {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.card-position {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  letter-spacing: 0.01em;
}

.card-date {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.card-edit {
  font-size: 13px;
  color: var(--color-text-tertiary);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 400;
}

.card-edit:hover {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.card-delete {
  font-size: 13px;
  color: var(--color-text-tertiary);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 400;
}

.card-delete:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.card-timeline {
  display: flex;
  align-items: center;
  padding: 0 var(--space-sm);
  padding-bottom: var(--space-2xl);
  overflow-x: auto;
  gap: 0;
}

.card-timeline > :deep(.timeline-node) {
  padding-bottom: var(--space-sm);
}
</style>
