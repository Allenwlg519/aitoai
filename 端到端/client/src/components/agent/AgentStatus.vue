<!--
  Agent 状态指示器
  职责: 显示 Agent 当前的运行状态、进度信息
-->
<template>
  <div :class="['agent-status', `agent-status--${state}`]">
    <StatusDot :status="statusMap[state] || 'inactive'" />
    <span>{{ statusText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatusDot from '../common/StatusDot.vue'

const props = defineProps({
  state: { type: String, default: 'idle' },
})

const statusMap = {
  idle: 'inactive',
  running: 'active',
  paused: 'warning',
  completed: 'active',
  error: 'error',
}

const statusText = computed(() => {
  const map = {
    idle: '等待中',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    error: '出错了',
  }
  return map[props.state] || '未知'
})
</script>

<style scoped>
.agent-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 4px;
  font-size: 13px;
}
.agent-status--running {
  background-color: rgba(166, 227, 161, 0.1);
  color: var(--color-success);
}
.agent-status--error {
  background-color: rgba(243, 139, 168, 0.1);
  color: var(--color-danger);
}
.agent-status--paused {
  background-color: rgba(249, 226, 175, 0.1);
  color: var(--color-warning);
}
</style>
