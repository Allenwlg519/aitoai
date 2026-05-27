<!--
  根组件
  职责: 应用整体布局框架（顶栏、侧栏、主内容区、底栏）
-->
<template>
  <div class="app-container">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="app-main">
        <router-view />
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { connect, subscribe } from './api/ws'
import { useAgentStore } from './stores/agent'
import { useProjectStore } from './stores/project'

const agentStore = useAgentStore()
const projectStore = useProjectStore()

let unsubscribers = []

async function initWebSocket() {
  try {
    await connect()
    console.log('WebSocket连接成功')
    
    // 订阅Agent状态更新
    unsubscribers.push(subscribe('agent:status', (payload) => {
      agentStore.setState(payload.state)
      if (payload.agentId) {
        agentStore.currentAgentId = payload.agentId
      }
    }))

    // 订阅Agent消息
    unsubscribers.push(subscribe('agent:message', (payload) => {
      agentStore.addMessage({
        role: 'assistant',
        content: payload.content,
      })
    }))

    // 订阅Agent日志
    unsubscribers.push(subscribe('agent:log', (payload) => {
      agentStore.addLog({
        level: payload.level,
        message: payload.message,
        timestamp: payload.timestamp,
      })
    }))

    // 订阅Agent完成
    unsubscribers.push(subscribe('agent:completed', () => {
      agentStore.setState('completed')
    }))

    // 订阅Agent错误
    unsubscribers.push(subscribe('agent:error', (payload) => {
      agentStore.addMessage({
        role: 'assistant',
        content: `错误: ${payload.message}`,
      })
      agentStore.setState('error')
    }))

    // 订阅权限请求
    unsubscribers.push(subscribe('permission_request', (payload) => {
      agentStore.setPendingPermission(payload)
    }))

    // 订阅代码差异
    unsubscribers.push(subscribe('code_diff', (payload) => {
      agentStore.setDiffContent(payload)
    }))

    // 订阅Shell输出
    unsubscribers.push(subscribe('shell_output', (payload) => {
      agentStore.addShellOutput({ text: payload.line })
    }))

    // 订阅项目更新
    unsubscribers.push(subscribe('project:updated', (payload) => {
      projectStore.setProject(payload.project)
    }))

    // 订阅连接建立
    unsubscribers.push(subscribe('connection:established', (payload) => {
      console.log('连接建立:', payload)
    }))

  } catch (error) {
    console.error('WebSocket连接失败:', error)
  }
}

onMounted(() => {
  initWebSocket()
})

onUnmounted(() => {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.app-main {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
