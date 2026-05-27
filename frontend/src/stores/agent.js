/**
 * Agent 状态管理 (Pinia)
 * 职责: 管理 Agent 运行状态、对话消息列表、日志流、Diff 内容、Shell 输出、权限审批
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAgentStore = defineStore('agent', () => {
  /** Agent 当前状态: idle / running / paused / completed / error */
  const state = ref('idle')

  /** 对话消息列表 */
  const messages = ref([])

  /** 实时日志列表 */
  const logs = ref([])

  /** 当前 Agent ID */
  const currentAgentId = ref(null)

  /** 代码差异对比内容（code_diff 消息） */
  const diffContent = ref(null)

  /** Shell 输出行列表（shell_output 消息） */
  const shellOutput = ref([])

  /** 待审批的权限请求（permission_request 消息） */
  const pendingPermission = ref(null)

  /** 是否正在运行 */
  const isRunning = computed(() => state.value === 'running')

  /** 是否可以暂停 */
  const canPause = computed(() => state.value === 'running')

  /** 是否可以恢复 */
  const canResume = computed(() => state.value === 'paused')

  /** 是否有待审批请求 */
  const hasPendingPermission = computed(() => pendingPermission.value !== null)

  /** 聊天面板是否折叠（集成布局用） */
  const chatCollapsed = ref(false)

  /** 切换聊天面板折叠状态 */
  function toggleChat() {
    chatCollapsed.value = !chatCollapsed.value
  }

  /** 更新状态 */
  function setState(newState) {
    state.value = newState
  }

  /** 添加对话消息 */
  function addMessage(msg) {
    messages.value.push(msg)
  }

  /** 添加日志条目 */
  function addLog(logEntry) {
    logs.value.push(logEntry)
    // TODO: 限制日志条数，防止内存溢出
  }

  /** 清空日志 */
  function clearLogs() {
    logs.value = []
  }

  /** 设置 Diff 内容 */
  function setDiffContent(data) {
    diffContent.value = {
      title: data.title || '代码变更',
      oldContent: data.oldContent || '',
      newContent: data.newContent || '',
    }
  }

  /** 清除 Diff 内容 */
  function clearDiff() {
    diffContent.value = null
  }

  /** 追加一行 Shell 输出 */
  function addShellOutput(line) {
    // 兼容后端发送的格式 { line: string }
    const text = line.line || line.text || ''
    shellOutput.value.push({
      text,
      type: line.type || 'stdout',
    })
    // 限制最多 1000 行，防止内存溢出
    if (shellOutput.value.length > 1000) {
      shellOutput.value = shellOutput.value.slice(-500)
    }
  }

  /** 清空 Shell 输出 */
  function clearShellOutput() {
    shellOutput.value = []
  }

  /** 设置待审批请求 */
  function setPendingPermission(req) {
    pendingPermission.value = {
      toolCallId: req.toolCallId,
      toolName: req.toolName || '',
      args: req.arguments || {},
    }
  }

  /** 清除待审批请求 */
  function clearPendingPermission() {
    pendingPermission.value = null
  }

  /** 重置状态 */
  function reset() {
    state.value = 'idle'
    messages.value = []
    logs.value = []
    currentAgentId.value = null
    diffContent.value = null
    shellOutput.value = []
    pendingPermission.value = null
  }

  return {
    state, messages, logs, currentAgentId,
    diffContent, shellOutput, pendingPermission,
    isRunning, canPause, canResume, hasPendingPermission,
    chatCollapsed, toggleChat,
    setState, addMessage, addLog, clearLogs,
    setDiffContent, clearDiff,
    addShellOutput, clearShellOutput,
    setPendingPermission, clearPendingPermission,
    reset,
  }
})
