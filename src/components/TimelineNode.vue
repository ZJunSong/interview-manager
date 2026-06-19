<template>
  <div class="timeline-node" :class="{ interactive: stage.status === 'current' }">
    <div
      class="node-circle"
      :class="stage.status"
      @click="handleClick"
      @keydown="onKeydown"
      :role="stage.status === 'current' ? 'button' : undefined"
      :tabindex="stage.status === 'current' ? 0 : undefined"
      :aria-label="stage.status === 'current' ? `设置「${stage.name}」阶段状态` : undefined"
      :ref="(el) => { if (el) nodeEl = el as HTMLElement }"
    >
      <span v-if="stage.status === 'pass'" class="node-icon">✓</span>
      <span v-else-if="stage.status === 'fail'" class="node-icon">✕</span>
      <span v-else-if="stage.status === 'rejected'" class="node-icon">−</span>
      <span v-else-if="stage.status === 'skip'" class="node-icon">―</span>
      <span v-else-if="stage.status === 'current'" class="node-pulse"></span>
      <span class="node-label" :class="stage.status">{{ stage.name }}</span>
    </div>

    <div
      v-if="!isLast"
      class="node-connector"
      :style="{ background: connectorColor }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Stage } from '../types';

const props = defineProps<{
  stage: Stage;
  index: number;
  isLast: boolean;
  connectorColor: string;
}>();

const emit = defineEmits<{
  click: [index: number, el: HTMLElement];
}>();

const nodeEl = ref<HTMLElement | null>(null);

function handleClick() {
  if (props.stage.status === 'current' && nodeEl.value) {
    emit('click', props.index, nodeEl.value);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.stage.status !== 'current') return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (nodeEl.value) emit('click', props.index, nodeEl.value);
  }
}
</script>

<style scoped>
.timeline-node {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.node-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
  z-index: 1;
}

.interactive .node-circle {
  cursor: pointer;
}

.interactive .node-circle:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 6px var(--color-current-glow);
}

.interactive .node-circle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

/* pending */
.node-circle.pending {
  background: var(--color-surface-solid);
  border: 2px dashed var(--color-pending-border);
}

/* current — 加外发光环 */
.node-circle.current {
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
  animation: pulse-ring 2s infinite;
}

.node-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
}

/* pass */
.node-circle.pass {
  background: var(--color-success);
  box-shadow: 0 1px 3px rgba(34, 197, 94, 0.3);
}

/* fail */
.node-circle.fail {
  background: var(--color-danger);
  box-shadow: 0 1px 3px rgba(239, 68, 68, 0.3);
}

/* rejected */
.node-circle.rejected {
  background: var(--color-surface-solid);
  border: 2px solid var(--color-danger);
}

.node-circle.rejected .node-icon {
  color: var(--color-danger);
  font-size: 18px;
}

/* skip */
.node-circle.skip {
  background: var(--color-surface-solid);
  border: 2px solid var(--color-gray);
}

.node-circle.skip .node-icon {
  color: var(--color-gray);
  font-size: 16px;
}

.node-icon {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.node-label {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  font-weight: 400;
  transition: color var(--duration-fast) var(--ease-out);
}

/* 当前/通过阶段的标签加粗高亮 */
.node-label.current {
  color: var(--color-accent);
  font-weight: 600;
}

.node-label.pass {
  color: var(--color-success);
  font-weight: 500;
}

.node-label.fail,
.node-label.rejected {
  color: var(--color-danger);
}

.node-connector {
  width: 64px;
  height: 2px;
  flex-shrink: 0;
  border-radius: 1px;
  transition: background var(--duration-normal) var(--ease-out);
  margin-left: -1px;
}
</style>
