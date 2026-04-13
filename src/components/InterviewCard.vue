<template>
  <div class="card" :style="{ animationDelay: `${index * 60}ms` }">
    <div class="card-header">
      <div class="card-info">
        <h2 class="card-company">{{ interview.company }}</h2>
        <span class="card-position">{{ interview.position }}</span>
      </div>
      <button class="card-delete" @click="$emit('delete', interview.id)">删除</button>
    </div>

    <div class="card-timeline">
      <TimelineNode
        v-for="(stage, i) in interview.stages"
        :key="i"
        :stage="stage"
        :index="i"
        :is-last="i === interview.stages.length - 1"
        :connector-color="(stage.status === 'pass' || stage.status === 'skip') ? 'var(--color-connector-pass)' : 'var(--color-connector)'"
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
}>();
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
