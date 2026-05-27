<!--
  Agent 工作台页
  职责: 以聊天框为核心控制入口的 Agent 交互界面
        用户在输入框发送消息 → 自动启动或继续对话
        DiffViewer / Terminal / PermissionDialog 自动弹出
-->
<template>
  <div class="agent-view">
    <AgentPanel :compact="projectStore.hasProject" />
  </div>
</template>

<script setup>
import { useProjectStore } from '../stores/project'
import AgentPanel from '../components/agent/AgentPanel.vue'

const projectStore = useProjectStore()
</script>

<style scoped>
.agent-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
