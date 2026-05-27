<!--
  Agent 交互主面板
  职责: 组合聊天、状态、日志、DiffViewer、Terminal、PermissionDialog 子组件
-->
<template>
  <!-- ====== 全屏聊天模式（未导入项目） ====== -->
  <div v-if="!compact" class="agent-panel">
    <AgentStatus :state="agentStore.state" />
    <AgentChat
      :messages="agentStore.messages"
      :disabled="false"
      @send="handleSend"
    />
    <AgentLog :logs="agentStore.logs" />
  </div>

  <!-- ====== 集成布局模式（已导入项目） ====== -->
  <div v-else class="integrated-layout">
    <div class="code-area">
      <ProjectEditor />
    </div>
    <div class="chat-sidebar" :class="{ collapsed: agentStore.chatCollapsed }">
      <div class="chat-toggle-area">
        <button
          class="chat-toggle-btn"
          :title="agentStore.chatCollapsed ? '展开聊天' : '折叠聊天'"
          @click="agentStore.toggleChat()"
        >
          <span v-if="agentStore.chatCollapsed">◀</span>
          <span v-else>▶</span>
        </button>
      </div>
      <div v-show="!agentStore.chatCollapsed" class="chat-sidebar-content">
        <AgentStatus :state="agentStore.state" />
        <AgentChat
          :messages="agentStore.messages"
          :disabled="false"
          @send="handleSend"
        />
        <AgentLog :logs="agentStore.logs" />
      </div>
    </div>
  </div>

  <!-- ====== 全局覆盖组件（所有模式下共享） ====== -->
  <PermissionDialog
    :visible="agentStore.hasPendingPermission"
    :tool-name="agentStore.pendingPermission?.toolName || ''"
    :args="agentStore.pendingPermission?.args || {}"
    @approve="handleApprove"
    @reject="handleReject"
  />

  <DiffViewer
    v-if="agentStore.diffContent"
    :visible="!!agentStore.diffContent"
    :old-content="agentStore.diffContent.oldContent"
    :new-content="agentStore.diffContent.newContent"
    :title="agentStore.diffContent.title"
    @close="agentStore.clearDiff()"
  />

  <Terminal
    v-if="agentStore.shellOutput.length > 0"
    :visible="agentStore.shellOutput.length > 0"
    :output-lines="agentStore.shellOutput"
    @clear="agentStore.clearShellOutput()"
  />
</template>

<script setup>
import { useAgentStore } from '../../stores/agent'
import { runAgent, sendAgentMessage, respondPermission } from '../../api'
import AgentStatus from './AgentStatus.vue'
import AgentChat from './AgentChat.vue'
import AgentLog from './AgentLog.vue'
import DiffViewer from './DiffViewer.vue'
import Terminal from './Terminal.vue'
import PermissionDialog from './PermissionDialog.vue'
import ProjectEditor from '../project/ProjectEditor.vue'

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})

const agentStore = useAgentStore()

function handleSend(content) {
  if (agentStore.currentAgentId && agentStore.isRunning) {
    // 已有运行中的 Agent → 发送消息
    sendAgentMessage(agentStore.currentAgentId, content)
  } else {
    // 无运行中 Agent → 自动启动新任务
    agentStore.setState('running')
    runAgent(content, {})
  }
  // 乐观添加用户消息到列表
  agentStore.addMessage({
    role: 'user',
    content,
  })
}

function handleApprove(alwaysAllow) {
  const req = agentStore.pendingPermission
  if (req) {
    respondPermission(req.toolCallId, true, alwaysAllow)
    agentStore.clearPendingPermission()
  }
}

function handleReject() {
  const req = agentStore.pendingPermission
  if (req) {
    respondPermission(req.toolCallId, false, false)
    agentStore.clearPendingPermission()
  }
}
</script>

<style scoped>
.agent-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-md);
}

/* ===== 集成布局（项目已导入模式） ===== */
.integrated-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
}

.code-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.chat-sidebar {
  display: flex;
  flex-direction: row;
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid var(--color-bg-surface);
  background: var(--color-bg-secondary);
  transition: width 0.2s ease;
  overflow: hidden;
}

.chat-sidebar.collapsed {
  width: 32px;
}

.chat-toggle-area {
  flex: 0 0 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--color-bg-surface);
}

.chat-toggle-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.chat-toggle-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.chat-sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  padding: var(--spacing-sm);
  gap: var(--spacing-sm);
}

.chat-sidebar-content .agent-status,
.chat-sidebar-content .agent-chat,
.chat-sidebar-content .agent-log {
  flex-shrink: 0;
}

.chat-sidebar-content .agent-chat {
  flex: 1;
  min-height: 0;
}

.chat-sidebar-content .agent-log {
  max-height: 150px;
}
</style>
