<template>
  <header class="topbar">
    <div class="topbar-inner">
      <h1 class="topbar-title">面试记录</h1>

      <div class="topbar-search">
        <input
          class="search-input"
          type="text"
          placeholder="搜索公司或职位…"
          :value="searchQuery"
          aria-label="搜索公司或职位"
          autocomplete="off"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <span class="search-icon" aria-hidden="true">⌕</span>
      </div>

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

      <span v-if="totalCount > 0" class="topbar-count">
        {{ searchQuery ? `${filteredCount} / ${totalCount}` : totalCount }} 条记录
      </span>

      <select class="topbar-sort" :value="sortBy" aria-label="排序方式" @change="$emit('update:sortBy', ($event.target as HTMLSelectElement).value)">
        <option value="newest">最新优先</option>
        <option value="oldest">最早优先</option>
        <option value="company">按公司名</option>
        <option value="progress">按进度</option>
      </select>

      <div class="topbar-actions">
        <button type="button" class="topbar-btn secondary" title="导出数据" @click="$emit('export')">
          <span>导出</span>
        </button>
        <label class="topbar-btn secondary" title="导入数据">
          <span>导入</span>
          <input
            type="file"
            accept=".json"
            class="file-input"
            @change="onImportFile"
          />
        </label>
        <button type="button" class="topbar-add" @click="$emit('add')">
          <span class="add-icon" aria-hidden="true">+</span>
          <span>新增记录</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  searchQuery: string;
  sortBy: string;
  totalCount: number;
  filteredCount: number;
}>();

const emit = defineEmits<{
  add: [];
  export: [];
  'import': [file: File];
  'update:searchQuery': [query: string];
  'update:sortBy': [sortBy: string];
}>();

const legend = [
  { status: 'pending', label: '未到达' },
  { status: 'current', label: '当前' },
  { status: 'pass', label: '通过' },
  { status: 'fail', label: '未通过' },
  { status: 'rejected', label: '拒绝' },
  { status: 'skip', label: '跳过' }
];

function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('import', file);
    input.value = '';
  }
}
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

.topbar-search {
  position: relative;
  flex: 0 0 200px;
}

.search-input {
  width: 100%;
  padding: 7px 12px 7px 30px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  font-size: 13px;
  background: var(--color-surface-solid);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.search-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--color-text-tertiary);
  pointer-events: none;
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

.legend-node.pass { background: var(--color-success); }
.legend-node.fail { background: var(--color-danger); }

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

.legend-icon.rejected { color: var(--color-danger); }
.legend-icon.skip { color: var(--color-gray); }

.topbar-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.topbar-sort {
  padding: 6px 10px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-solid);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.topbar-sort:focus {
  border-color: var(--color-accent);
}

.topbar-sort:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  outline: none;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.topbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
  position: relative;
}

.topbar-btn.secondary:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.topbar-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  outline: none;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
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

.topbar-add:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  outline: none;
}

.add-icon {
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
}

@media (max-width: 1000px) {
  .topbar-inner {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .topbar-legend {
    order: 4;
    width: 100%;
    justify-content: flex-start;
    padding-top: var(--space-xs);
  }
  .topbar-search {
    flex: 1 1 150px;
    order: 2;
  }
  .topbar-count {
    order: 3;
  }
  .topbar-sort {
    order: 3;
  }
  .topbar-actions {
    order: 1;
  }
}
</style>
