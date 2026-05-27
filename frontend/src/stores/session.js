/**
 * 会话状态管理 (Pinia)
 * 职责: 管理 WebSocket 连接状态、会话标识、连接统计
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  /** 连接状态: disconnected / connecting / connected */
  const connectionStatus = ref('disconnected')

  /** 当前会话 ID */
  const sessionId = ref(null)

  /** 重连次数 */
  const reconnectCount = ref(0)

  /** 是否已连接 */
  const isConnected = computed(() => connectionStatus.value === 'connected')

  /** 是否正在连接 */
  const isConnecting = computed(() => connectionStatus.value === 'connecting')

  /** 设置连接状态 */
  function setConnectionStatus(status) {
    connectionStatus.value = status
  }

  /** 设置会话 ID */
  function setSessionId(id) {
    sessionId.value = id
  }

  /** 增加重连计数 */
  function incrementReconnect() {
    reconnectCount.value++
  }

  /** 重置重连计数 */
  function resetReconnect() {
    reconnectCount.value = 0
  }

  return {
    connectionStatus, sessionId, reconnectCount,
    isConnected, isConnecting,
    setConnectionStatus, setSessionId, incrementReconnect, resetReconnect,
  }
})
