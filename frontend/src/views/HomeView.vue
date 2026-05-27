<!--
  首页仪表盘
  职责: 应用概览、最近项目、快速操作入口
-->
<template>
  <div class="home-view">
    <h1>端到端智能软件开发工具</h1>
    <p class="subtitle">AI 驱动的全流程软件开发助手</p>

    <div class="quick-actions">
      <div class="action-card" @click="goToAgent">
        <h3>🤖 Agent 工作台</h3>
        <p>启动 AI Agent 辅助开发</p>
      </div>
      <div class="action-card" @click="goToProject">
        <h3>📁 项目管理</h3>
        <p>浏览和管理项目文件</p>
      </div>
    </div>

    <!-- TODO: 最近项目列表 -->
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToAgent() {
  router.push('/agent')
}
function goToProject() {
  router.push('/project')
}
</script>

<style scoped>
.home-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}
h1 {
  font-size: 28px;
  margin-bottom: var(--spacing-sm);
}
.subtitle {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}
.action-card {
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-surface);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.action-card:hover {
  border-color: var(--color-accent);
}
.action-card h3 {
  margin-bottom: var(--spacing-sm);
}
</style>
