<template>
  <Teleport to="body">
    <div v-if="visible && interview" class="modal-overlay" @click.self="close">
      <div class="modal">
        <h2 class="modal-title">编辑面试信息</h2>

        <div class="modal-field">
          <label class="field-label">公司名称</label>
          <input
            ref="companyInput"
            v-model="company"
            class="field-input"
            placeholder="输入公司名称"
            @keydown.enter="positionInput?.focus()"
          />
        </div>

        <div class="modal-field">
          <label class="field-label">投递职位</label>
          <input
            ref="positionInput"
            v-model="position"
            class="field-input"
            placeholder="输入投递职位"
            @keydown.enter="submit"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="close">取消</button>
          <button class="btn-submit" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { Interview } from '../types';

const props = defineProps<{
  visible: boolean;
  interview: Interview | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [company: string, position: string];
}>();

const company = ref('');
const position = ref('');
const companyInput = ref<HTMLInputElement | null>(null);
const positionInput = ref<HTMLInputElement | null>(null);

watch(() => props.visible, (val) => {
  if (val && props.interview) {
    company.value = props.interview.company;
    position.value = props.interview.position;
    nextTick(() => companyInput.value?.focus());
  }
});

function submit() {
  if (!company.value.trim() || !position.value.trim()) return;
  emit('submit', company.value.trim(), position.value.trim());
}

function close() {
  emit('close');
}
</script>

<style scoped>
@import '../assets/styles/modal.css';
</style>
