import { ref } from 'vue';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'interview-manager-theme';
export const theme = ref<Theme>('light');

function applyTheme(): void {
  document.documentElement.dataset.theme = theme.value;
}

// 在页面挂载前恢复主题，默认保留原来的白天配色。
export function initializeTheme(): void {
  try {
    theme.value = localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    // 浏览器禁用本地存储时，仍然可以使用和切换主题。
    theme.value = 'light';
  }
  applyTheme();
}

export function toggleTheme(): void {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();

  try {
    localStorage.setItem(STORAGE_KEY, theme.value);
  } catch {
    // 保存失败只影响下次打开页面，不影响本次切换。
  }
}
