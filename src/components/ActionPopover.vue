<template>
  <Teleport to="body">
    <div v-if="visible" class="popover-overlay" @click.self="$emit('close')">
      <div
        class="popover"
        :style="{
          top: `${pos.top}px`,
          left: `${pos.left}px`
        }"
        :class="placement"
      >
        <div class="popover-arrow"></div>
        <button type="button" class="popover-btn pass" @click="$emit('action', 'pass')">
          <span class="btn-dot pass"></span>通过
        </button>
        <button type="button" class="popover-btn fail" @click="$emit('action', 'fail')">
          <span class="btn-dot fail"></span>未通过
        </button>
        <button type="button" class="popover-btn skip" @click="$emit('action', 'skip')">
          <span class="btn-dot skip"></span>跳过
        </button>
        <button type="button" class="popover-btn rejected" @click="$emit('action', 'rejected')">
          <span class="btn-dot rejected"></span>拒绝
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  rect: DOMRect | null;
}>();

defineEmits<{
  action: [status: 'pass' | 'fail' | 'skip' | 'rejected'];
  close: [];
}>();

const placement = computed(() => {
  if (!props.rect) return 'below';
  // 上方空间不足时放下方，下方空间不足时放上方
  const spaceAbove = props.rect.top;
  const spaceBelow = window.innerHeight - props.rect.bottom;
  if (spaceAbove > 200 && spaceAbove >= spaceBelow) return 'above';
  if (spaceBelow > 200) return 'below';
  return spaceAbove > spaceBelow ? 'above' : 'below';
});

const pos = computed(() => {
  if (!props.rect) return { top: 0, left: 0 };
  const popoverWidth = 160;
  const offset = 12;
  const padding = 8;

  let left = props.rect.left + props.rect.width / 2 - popoverWidth / 2;
  // 水平方向限制在视口内
  left = Math.max(padding, Math.min(left, window.innerWidth - popoverWidth - padding));

  const spaceAbove = props.rect.top;
  const spaceBelow = window.innerHeight - props.rect.bottom;
  // 优先放上方，除非上方空间明显不足
  if (spaceAbove > 200 && spaceAbove >= spaceBelow) {
    return { top: props.rect.top - offset, left };
  }
  return { top: props.rect.bottom + offset, left };
});
</script>

<style scoped>
.popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.popover {
  position: fixed;
  width: 160px;
  background: var(--color-surface-solid);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  padding: var(--space-xs);
  z-index: 201;
  animation: scale-in var(--duration-fast) var(--ease-spring);
}

.popover.above {
  /* Position is already calculated in JS, no transform needed */
}

.popover-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--color-surface-solid);
  transform: rotate(45deg);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.05);
}

.popover.above .popover-arrow {
  bottom: -6px;
  left: 50%;
  margin-left: -6px;
  transform: rotate(45deg);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.05);
}

.popover.below .popover-arrow {
  top: -6px;
  left: 50%;
  margin-left: -6px;
}

.popover-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  transition: background var(--duration-fast) var(--ease-out);
  text-align: left;
}

.popover-btn:hover {
  background: var(--color-bg);
}

.btn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.btn-dot.pass { background: var(--color-success); }
.btn-dot.fail { background: var(--color-danger); }
.btn-dot.skip { background: var(--color-gray); }
.btn-dot.rejected { border: 1.5px solid var(--color-danger); }
</style>
