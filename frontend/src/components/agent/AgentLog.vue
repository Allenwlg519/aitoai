<!--
  Agent 实时日志
  职责: 流式展示 Agent 执行过程中的日志信息
-->
<template>
  <div class="agent-log">
    <div class="log-header">执行日志</div>
    <div class="log-body" ref="logBodyRef">
      <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
      <div
        v-for="(log, index) in logs"
        :key="index"
        :class="['log-entry', `log-entry--${log.level}`]"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
})

const logBodyRef = ref(null)

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString()
}

// 新日志时滚动到底部
watch(() => props.logs.length, async () => {
  await nextTick()
  if (logBodyRef.value) {
    logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight
  }
})
</script>

<style scoped>
.agent-log {
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  max-height: 200px;
  display: flex;
  flex-direction: column;
}
.log-header {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-bg-surface);
  background-color: var(--color-bg-secondary);
}
.log-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xs);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
.log-empty {
  color: var(--color-text-secondary);
  padding: var(--spacing-sm);
  text-align: center;
}
.log-entry {
  display: flex;
  gap: var(--spacing-sm);
  padding: 1px var(--spacing-sm);
}
.log-time {
  color: var(--color-text-secondary);
  min-width: 80px;
}
.log-level {
  min-width: 50px;
}
.log-entry--info .log-level { color: var(--color-accent); }
.log-entry--warn .log-level { color: var(--color-warning); }
.log-entry--error .log-level { color: var(--color-danger); }
</style>
