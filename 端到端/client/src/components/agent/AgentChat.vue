<!--
  Agent 对话消息列表
  职责: 展示用户与 Agent 的全部交互消息（对话、思考、工具调用、结果），提供消息输入框
-->
<template>
  <div class="agent-chat">
    <div class="message-list" ref="messageListRef">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', messageClass(msg)]"
      >
        <!-- 用户消息 -->
        <template v-if="msg.role === 'user'">
          <div class="message-role">用户</div>
          <div class="message-content">{{ msg.content }}</div>
        </template>

        <!-- Agent 思考步骤 -->
        <template v-else-if="msg.type === 'agent_thought'">
          <div class="message-role thought-role">🤔 {{ msg.payload?.title || '思考' }}</div>
          <div class="message-content thought-content">{{ msg.payload?.content }}</div>
        </template>

        <!-- 工具调用 -->
        <template v-else-if="msg.type === 'tool_call'">
          <div class="message-role tool-role">🔧 工具调用</div>
          <div class="message-content tool-content">
            <code>{{ msg.payload?.toolName }}</code>
            <pre v-if="msg.payload?.arguments">{{ formatArgs(msg.payload.arguments) }}</pre>
          </div>
        </template>

        <!-- 工具结果 -->
        <template v-else-if="msg.type === 'tool_result'">
          <div class="message-role result-role">
            {{ msg.payload?.success ? '✅ 执行成功' : '❌ 执行失败' }}
          </div>
          <div class="message-content result-content">
            <pre>{{ msg.payload?.output || msg.payload?.error || '' }}</pre>
          </div>
        </template>

        <!-- Agent 对话回复 -->
        <template v-else-if="msg.role === 'assistant'">
          <div class="message-role">Agent</div>
          <div class="message-content">{{ msg.content }}</div>
        </template>

        <!-- 错误消息 -->
        <template v-else-if="msg.type === 'error'">
          <div class="message-role error-role">⚠️ 错误</div>
          <div class="message-content error-content">{{ msg.payload?.message }}</div>
        </template>

        <!-- 兜底 -->
        <template v-else>
          <div class="message-role">系统</div>
          <div class="message-content">{{ msg.content || JSON.stringify(msg) }}</div>
        </template>
      </div>
      <div v-if="messages.length === 0" class="message-empty">
        输入消息开始与 AI Agent 对话
      </div>
    </div>
    <div class="input-area">
      <input
        v-model="inputText"
        type="text"
        placeholder="输入消息，按 Enter 发送..."
        :disabled="disabled"
        @keydown.enter="send"
      />
      <button :disabled="disabled || !inputText.trim()" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['send'])

const inputText = ref('')
const messageListRef = ref(null)

function formatArgs(args) {
  try {
    return JSON.stringify(typeof args === 'string' ? JSON.parse(args) : args, null, 2)
  } catch {
    return String(args)
  }
}

function messageClass(msg) {
  if (msg.type === 'agent_thought') return 'message--thought'
  if (msg.type === 'tool_call') return 'message--tool-call'
  if (msg.type === 'tool_result') return 'message--tool-result'
  if (msg.type === 'error') return 'message--error'
  return `message--${msg.role || 'system'}`
}

function send() {
  const text = inputText.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  inputText.value = ''
}

// 新消息时滚动到底部
watch(() => props.messages.length, async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
})
</script>

<style scoped>
.agent-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  overflow: hidden;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.message {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 4px;
  max-width: 85%;
}
.message--user {
  align-self: flex-end;
  background-color: var(--color-accent);
  color: var(--color-bg-primary);
}
.message--assistant {
  align-self: flex-start;
  background-color: var(--color-bg-surface);
}
.message--thought {
  align-self: flex-start;
  background-color: rgba(137, 180, 250, 0.1);
  border-left: 3px solid var(--color-accent);
  max-width: 95%;
}
.message--tool-call {
  align-self: flex-start;
  background-color: rgba(249, 226, 175, 0.1);
  border-left: 3px solid var(--color-warning);
  max-width: 95%;
}
.message--tool-result {
  align-self: flex-start;
  background-color: rgba(166, 227, 161, 0.1);
  border-left: 3px solid var(--color-success);
  max-width: 95%;
}
.message--error {
  align-self: flex-start;
  background-color: rgba(243, 139, 168, 0.15);
  border-left: 3px solid var(--color-danger);
  max-width: 95%;
}
.message-role {
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 2px;
  font-weight: 600;
}
.thought-role { color: var(--color-accent); }
.tool-role { color: var(--color-warning); }
.result-role { color: var(--color-success); }
.error-role { color: var(--color-danger); }
.message-content {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.thought-content {
  color: var(--color-text-secondary);
  font-style: italic;
}
.tool-content code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: rgba(0,0,0,0.2);
  padding: 1px 6px;
  border-radius: 3px;
}
.tool-content pre,
.result-content pre {
  font-family: var(--font-mono);
  font-size: 11px;
  margin-top: 4px;
  padding: var(--spacing-xs);
  background: rgba(0,0,0,0.15);
  border-radius: 3px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.message-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}
.input-area {
  display: flex;
  padding: var(--spacing-sm);
  border-top: 1px solid var(--color-bg-surface);
  gap: var(--spacing-sm);
}
.input-area input {
  flex: 1;
  padding: var(--spacing-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  color: var(--color-text-primary);
  font-size: 13px;
}
.input-area input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.input-area button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-accent);
  border: none;
  border-radius: 4px;
  color: var(--color-bg-primary);
  cursor: pointer;
  font-weight: 600;
}
.input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
