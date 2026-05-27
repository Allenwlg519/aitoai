<!--
  顶部导航栏
  职责: 应用 Logo、项目选择器、用户菜单
-->
<template>
  <header class="app-header">
    <div class="header-left">
      <span class="logo">端到端 AI</span>
    </div>
    <div class="header-center">
      <!-- TODO: 项目选择器 -->
    </div>
    <div class="header-right">
      <!-- TODO: 用户菜单 -->
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-bg-surface);
}
.logo {
  font-weight: 700;
  font-size: 16px;
  color: var(--color-accent);
}
</style>
