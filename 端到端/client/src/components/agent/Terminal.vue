<!--
  Terminal 组件
  职责: 黑底绿字终端风格输出组件，逐行展示 Shell 命令的 stdout/stderr
-->
<template>
  <div v-if="visible" class="terminal">
    <div class="terminal-header">
      <span class="terminal-title">终端输出</span>
      <span class="terminal-info">{{ outputLines.length }} 行</span>
      <button class="terminal-clear" @click="$emit('clear')">清空</button>
    </div>
    <div class="terminal-body" ref="terminalBodyRef">
      <div v-if="outputLines.length === 0" class="terminal-empty">
        $ 等待命令输出...
      </div>
      <div
        v-for="(line, index) in outputLines"
        :key="index"
        :class="['terminal-line', `terminal-line--${line.type}`]"
      >
        <span class="terminal-prompt">$</span>
        <span class="terminal-text">{{ line.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  outputLines: { type: Array, default: () => [] },
  visible: { type: Boolean, default: false },
})

defineEmits(['clear'])

const terminalBodyRef = ref(null)

watch(() => props.outputLines.length, async () => {
  await nextTick()
  if (terminalBodyRef.value) {
    terminalBodyRef.value.scrollTop = terminalBodyRef.value.scrollHeight
  }
})
</script>

<style scoped>
.terminal {
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  overflow: hidden;
  background: #0d1117;
  font-family: var(--font-mono);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.terminal-title {
  font-size: 12px;
  color: #8b949e;
}

.terminal-info {
  font-size: 11px;
  color: #484f58;
  margin-left: auto;
}

.terminal-clear {
  background: none;
  border: 1px solid #30363d;
  color: #8b949e;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  cursor: pointer;
}
.terminal-clear:hover {
  background: #21262d;
  color: #c9d1d9;
}

.terminal-body {
  max-height: 300px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  line-height: 1.5;
  font-size: 13px;
}

.terminal-empty {
  color: #484f58;
  font-style: italic;
}

.terminal-line {
  display: flex;
  gap: var(--spacing-sm);
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-prompt {
  color: #484f58;
  user-select: none;
  min-width: 14px;
}

/* stdout — 柔和绿 */
.terminal-line--stdout .terminal-text {
  color: #a6e3a1;
}

/* stderr — 红色 */
.terminal-line--stderr .terminal-text {
  color: #f38ba8;
}

/* 滚动条 */
.terminal-body::-webkit-scrollbar {
  width: 6px;
}
.terminal-body::-webkit-scrollbar-track {
  background: transparent;
}
.terminal-body::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}
</style>
