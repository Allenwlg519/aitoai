/**
 * WebSocket 客户端组合式函数 (useSocket)
 * 职责: 封装 WebSocket 连接生命周期，提供响应式消息数组和发送接口
 *       支持自动重连、类型过滤订阅
 *
 * 用法:
 *   const { send, messages } = useSocket()
 *   send('user_message', { content: '你好' })
 *   // messages 自动更新为 [{ type, id, timestamp, payload }, ...]
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { connect, disconnect, subscribe, send as rawSend } from '../api/ws'
import { useSessionStore } from '../stores/session'

/**
 * @param {object} options
 * @param {boolean} [options.autoConnect=true] - 是否自动连接
 * @param {number}   [options.maxMessages=500] - 消息数组最大长度，超限时丢弃最早的消息
 */
export function useSocket(options = {}) {
  const { autoConnect = true, maxMessages = 500 } = options

  /** 响应式消息数组，按时间正序 */
  const messages = ref([])

  /** 会话存储 */
  const sessionStore = useSessionStore()

  /** 存放订阅退订函数的数组 */
  let unsubscribers = []

  /**
   * 发送消息（封装底层 send）
   * @param {string} type - 消息类型
   * @param {object} payload - 消息载荷
   */
  function send(type, payload) {
    rawSend(type, payload)
  }

  /** 连接成功后初始化订阅 */
  function setupSubscriptions() {
    // 订阅所有消息，追加到 messages 数组
    const unsubAll = subscribe('*', (payload, rawMessage) => {
      messages.value.push(rawMessage)
      // 超出上限时丢弃最早的消息
      if (messages.value.length > maxMessages) {
        messages.value.splice(0, messages.value.length - maxMessages)
      }
    })
    unsubscribers.push(unsubAll)

    // 监听 session_init 获取 sessionId
    const unsubInit = subscribe('session_init', (payload) => {
      sessionStore.setSessionId(payload.sessionId)
    })
    unsubscribers.push(unsubInit)

    // 监听 error 类型消息，更新连接状态
    const unsubError = subscribe('error', () => {
      // 可根据业务需求在此扩展错误处理
    })
    unsubscribers.push(unsubError)
  }

  /** 发起连接 */
  async function doConnect() {
    sessionStore.setConnectionStatus('connecting')
    try {
      await connect()
      sessionStore.setConnectionStatus('connected')
      sessionStore.resetReconnect()
      setupSubscriptions()
    } catch (err) {
      sessionStore.setConnectionStatus('disconnected')
      sessionStore.incrementReconnect()
      console.error('WebSocket 连接失败:', err)
    }
  }

  onMounted(() => {
    if (autoConnect) {
      doConnect()
    }
  })

  onUnmounted(() => {
    // 退订所有监听
    unsubscribers.forEach((fn) => fn())
    unsubscribers = []
    // 断连（auto-reconnect 在 api/ws.js 内部管理）
    disconnect()
  })

  return {
    /** 发送消息 */
    send,
    /** 消息数组（响应式） */
    messages,
  }
}
