<!--
  底部状态栏
  职责: 显示连接状态、Agent 运行状态
-->
<template>
  <footer class="app-footer">
    <div class="footer-left">
      <StatusDot :status="connectionStatus" />
      <span class="status-text">连接: {{ connectionText }}</span>
    </div>
    <div class="footer-right">
      <span v-if="agentStore.isRunning" class="agent-status">
        <LoadingSpinner />
        Agent 运行中...
      </span>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from '../../stores/session'
import { useAgentStore } from '../../stores/agent'
import StatusDot from '../common/StatusDot.vue'
import LoadingSpinner from '../common/LoadingSpinner.vue'

const sessionStore = useSessionStore()
const agentStore = useAgentStore()

const connectionStatus = computed(() => sessionStore.connectionStatus)
const connectionText = computed(() => {
  switch (sessionStore.connectionStatus) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    default: return '未连接'
  }
})
</script>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--footer-height);
  padding: 0 var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-bg-surface);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.footer-left, .footer-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.agent-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
