<!--
  PermissionDialog 组件
  职责: 模态对话框，请求用户批准或拒绝敏感工具调用（如 Shell 命令）
        支持"本次会话始终允许"选项
-->
<template>
  <div v-if="visible" class="permission-overlay" @click.self="$emit('reject')">
    <div class="permission-dialog">
      <div class="dialog-header">权限请求</div>
      <div class="dialog-body">
        <p class="dialog-desc">Agent 请求执行以下操作：</p>
        <div class="dialog-tool-info">
          <span class="tool-label">工具：</span>
          <code class="tool-name">{{ toolName }}</code>
        </div>
        <div class="dialog-args">
          <span class="tool-label">参数：</span>
          <pre class="args-json">{{ formatArgs }}</pre>
        </div>
        <label class="always-allow">
          <input type="checkbox" v-model="alwaysAllow" />
          <span>本次会话始终允许</span>
        </label>
      </div>
      <div class="dialog-footer">
        <button class="btn btn--reject" @click="$emit('reject')">拒绝</button>
        <button class="btn btn--approve" @click="handleApprove">批准</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  toolName: { type: String, default: '' },
  args: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['approve', 'reject'])

const alwaysAllow = ref(false)

const formatArgs = computed(() => {
  try {
    return JSON.stringify(props.args, null, 2)
  } catch {
    return String(props.args)
  }
})

function handleApprove() {
  emit('approve', alwaysAllow.value)
  alwaysAllow.value = false
}

// 重置复选框状态（dialog 关闭时自动重置）
import { watch } from 'vue'
watch(() => props.visible, (val) => {
  if (!val) alwaysAllow.value = false
})
</script>

<style scoped>
.permission-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.permission-dialog {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-surface);
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  padding: var(--spacing-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-warning);
  border-bottom: 1px solid var(--color-bg-surface);
}

.dialog-body {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.dialog-desc {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.dialog-tool-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.tool-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 40px;
}

.tool-name {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-accent);
  background: var(--color-bg-surface);
  padding: 2px 8px;
  border-radius: 3px;
}

.dialog-args {
  display: flex;
  gap: var(--spacing-sm);
}

.args-json {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-sm);
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
  white-space: pre;
}

.always-allow {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-top: var(--spacing-sm);
}
.always-allow input {
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-bg-surface);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.btn--approve {
  background: var(--color-success);
  color: var(--color-bg-primary);
}
.btn--approve:hover {
  opacity: 0.9;
}

.btn--reject {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.btn--reject:hover {
  background: var(--color-danger);
  color: var(--color-bg-primary);
}
</style>
