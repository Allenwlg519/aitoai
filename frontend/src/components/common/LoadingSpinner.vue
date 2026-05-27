<!--
  加载旋转动画
  职责: 表示正在加载或处理中
-->
<template>
  <span class="loading-spinner"></span>
</template>

<style scoped>
.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-text-secondary);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
