<template>
  <header class="topbar">
    <div class="topbar-inner">
      <h1 class="topbar-title">面试记录</h1>

      <div class="topbar-legend">
        <div v-for="item in legend" :key="item.label" class="legend-item">
          <span class="legend-node" :class="item.status">
            <span v-if="item.status === 'pass'" class="legend-icon">✓</span>
            <span v-else-if="item.status === 'fail'" class="legend-icon">✕</span>
            <span v-else-if="item.status === 'rejected'" class="legend-icon rejected">−</span>
            <span v-else-if="item.status === 'skip'" class="legend-icon skip">―</span>
            <span v-else-if="item.status === 'current'" class="legend-pulse"></span>
          </span>
          <span class="legend-label">{{ item.label }}</span>
        </div>
      </div>

      <button class="topbar-add" @click="$emit('add')">
        <span class="add-icon">+</span>
        <span>新增记录</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  add: [];
}>();

const legend = [
  { status: 'pending', label: '未到达' },
  { status: 'current', label: '当前' },
  { status: 'pass', label: '通过' },
  { status: 'fail', label: '未通过' },
  { status: 'rejected', label: '拒绝' },
  { status: 'skip', label: '跳过' }
];
</script>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(245, 245, 240, 0.82);
  backdrop-filter: var(--backdrop-blur);
  border-bottom: 1px solid var(--color-border);
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-md) var(--space-xl);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.topbar-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  flex-shrink: 0;
}

.topbar-legend {
  display: flex;
  gap: var(--space-md);
  flex: 1;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.legend-node {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend-node.pending {
  border: 2px dashed var(--color-pending-border);
  background: var(--color-surface-solid);
}

.legend-node.current {
  background: var(--color-accent);
  animation: pulse-ring 2s infinite;
}

.legend-pulse {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
}

.legend-node.pass {
  background: var(--color-success);
}

.legend-node.fail {
  background: var(--color-danger);
}

.legend-node.rejected {
  border: 2px solid var(--color-danger);
  background: var(--color-surface-solid);
}

.legend-node.skip {
  border: 2px solid var(--color-gray);
  background: var(--color-surface-solid);
}

.legend-icon {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.legend-icon.rejected {
  color: var(--color-danger);
}

.legend-icon.skip {
  color: var(--color-gray);
}

.topbar-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.topbar-add:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.topbar-add:active {
  transform: translateY(0);
}

.add-icon {
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
}
</style>
