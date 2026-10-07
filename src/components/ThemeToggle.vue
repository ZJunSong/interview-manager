<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="isDark ? '切换到白天模式' : '切换到夜间模式'"
    :aria-pressed="isDark"
    :title="isDark ? '切换到白天模式' : '切换到夜间模式'"
    @click="toggleTheme"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="isDark">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </template>
      <path v-else d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
    <span>{{ isDark ? '白天模式' : '夜间模式' }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { theme, toggleTheme } from '../utils/theme';

const isDark = computed(() => theme.value === 'dark');
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  background: var(--color-surface-solid);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}

.theme-toggle:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
</style>
