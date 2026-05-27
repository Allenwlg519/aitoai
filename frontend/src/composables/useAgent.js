/**
 * Agent 组合式函数
 * 职责: 封装 Agent 操作的常用逻辑（发送指令、监听状态、消息管理）
 *       订阅 code_diff / shell_output / permission_request 等实时事件
 */
import { onMounted, onUnmounted } from 'vue'
import { subscribe } from '../api/ws'
import { useAgentStore } from '../stores/agent'

/**
 * 使用 Agent 交互能力
 * @param {string} agentId - Agent ID
 */
export function useAgent(agentId) {
  const agentStore = useAgentStore()
  let unsubscribers = []

  onMounted(() => {
    // 监听 Agent 状态变更
    const unsubStatus = subscribe('agent:status', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.setState(payload.state)
      }
    })
    unsubscribers.push(unsubStatus)

    // 监听 Agent 日志
    const unsubLog = subscribe('agent:log', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.addLog(payload)
      }
    })
    unsubscribers.push(unsubLog)

    // 监听 Agent 完成事件
    const unsubComplete = subscribe('agent:completed', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.setState('completed')
      }
    })
    unsubscribers.push(unsubComplete)

    // 监听 Agent 错误
    const unsubError = subscribe('agent:error', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.setState('error')
        agentStore.addLog({ level: 'error', message: payload.message, timestamp: new Date().toISOString() })
      }
    })
    unsubscribers.push(unsubError)

    // 监听代码差异推送
    const unsubDiff = subscribe('code_diff', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.setDiffContent(payload)
      }
    })
    unsubscribers.push(unsubDiff)

    // 监听 Shell 输出
    const unsubShell = subscribe('shell_output', (payload) => {
      if (payload.text) {
        agentStore.addShellOutput({ text: payload.text, type: payload.type || 'stdout' })
      }
    })
    unsubscribers.push(unsubShell)

    // 监听权限审批请求
    const unsubPermission = subscribe('permission_request', (payload) => {
      if (payload.agentId === agentId) {
        agentStore.setPendingPermission(payload)
      }
    })
    unsubscribers.push(unsubPermission)
  })

  onUnmounted(() => {
    unsubscribers.forEach((fn) => fn())
    unsubscribers = []
  })
}
