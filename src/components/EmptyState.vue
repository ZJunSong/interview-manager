<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect x="8" y="10" width="40" height="38" rx="6" stroke="#d4d4d8" stroke-width="2" fill="none"/>
        <line x1="8" y1="20" x2="48" y2="20" stroke="#d4d4d8" stroke-width="2"/>
        <line x1="20" y1="6" x2="20" y2="14" stroke="#d4d4d8" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="6" x2="36" y2="14" stroke="#d4d4d8" stroke-width="2" stroke-linecap="round"/>
        <circle cx="28" cy="34" r="6" stroke="#d4d4d8" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/>
      </svg>
    </div>
    <p class="empty-text">暂无面试记录，点击「+ 新增记录」开始</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl) var(--space-xl);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.empty-icon {
  margin-bottom: var(--space-lg);
  opacity: 0.5;
}

.empty-text {
  font-size: 15px;
  color: var(--color-text-tertiary);
  font-weight: 400;
  letter-spacing: 0.01em;
}
</style>
