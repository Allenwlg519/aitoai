/**
 * WebSocket 客户端
 * 职责: 建立并管理 WebSocket 连接，提供自动重连、消息发送/订阅功能
 */

const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 10

/** 消息订阅者 Map: type → Set<callback> */
const subscribers = new Map()

let ws = null
let reconnectAttempts = 0
let reconnectTimer = null

/**
 * 建立 WebSocket 连接
 * @returns {Promise<void>}
 */
export function connect() {
  return new Promise((resolve, reject) => {
    // TODO: 使用环境变量中的 URL
    const url = `ws://${location.host}/ws`
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempts = 0
      resolve()
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        // 分发到对应类型的订阅者
        const typeSubscribers = subscribers.get(message.type)
        if (typeSubscribers) {
          typeSubscribers.forEach((cb) => cb(message.payload, message))
        }
        // 同时分发给通配符订阅者 '*'
        const wildcardSubscribers = subscribers.get('*')
        if (wildcardSubscribers) {
          wildcardSubscribers.forEach((cb) => cb(message.payload, message))
        }
      } catch (err) {
        console.error('WS 消息解析失败:', err)
      }
    }

    ws.onclose = () => {
      attemptReconnect()
    }

    ws.onerror = (err) => {
      reject(err)
    }
  })
}

/**
 * 断线自动重连
 */
function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
  reconnectAttempts++
  reconnectTimer = setTimeout(() => {
    connect()
  }, RECONNECT_DELAY)
}

/**
 * 发送消息
 * @param {string} type - 消息类型
 * @param {object} payload - 消息载荷
 */
export function send(type, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WS 未连接，消息丢弃:', type)
    return
  }
  ws.send(JSON.stringify({
    type,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
  }))
}

/**
 * 订阅指定类型的消息
 * @param {string} type - 消息类型 ('*' 表示所有消息)
 * @param {function} callback - (payload, rawMessage) => void
 * @returns {function} 取消订阅的函数
 */
export function subscribe(type, callback) {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set())
  }
  subscribers.get(type).add(callback)

  // 返回退订函数
  return () => {
    subscribers.get(type)?.delete(callback)
  }
}

/**
 * 断开连接
 */
export function disconnect() {
  clearTimeout(reconnectTimer)
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS // 阻止自动重连
  ws?.close()
  ws = null
}
