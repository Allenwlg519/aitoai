<!--
  DiffViewer 组件
  职责: 使用 diff 库对比文本差异，左右分栏展示代码变更
        删除行（左侧红色标注），新增行（右侧绿色标注）
-->
<template>
  <div v-if="visible" class="diff-viewer">
    <div class="diff-header">
      <span class="diff-title">{{ title || '代码差异对比' }}</span>
      <button class="diff-close" @click="$emit('close')">✕</button>
    </div>
    <div class="diff-body">
      <div class="diff-pane diff-pane--old">
        <div class="diff-pane-header">原内容</div>
        <div class="diff-content">
          <div
            v-for="(line, idx) in leftLines"
            :key="idx"
            :class="['diff-line', lineClassLeft(line)]"
          >
            <span class="diff-line-num">{{ idx + 1 }}</span>
            <span class="diff-line-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
      <div class="diff-pane diff-pane--new">
        <div class="diff-pane-header">新内容</div>
        <div class="diff-content">
          <div
            v-for="(line, idx) in rightLines"
            :key="idx"
            :class="['diff-line', lineClassRight(line)]"
          >
            <span class="diff-line-num">{{ idx + 1 }}</span>
            <span class="diff-line-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { diffLines } from 'diff'

const props = defineProps({
  oldContent: { type: String, default: '' },
  newContent: { type: String, default: '' },
  title: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})

defineEmits(['close'])

const leftLines = ref([])
const rightLines = ref([])

function computeDiff() {
  const changes = diffLines(props.oldContent || '', props.newContent || '')
  const left = []
  const right = []

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    if (change.added) {
      // 新增行 → 右侧绿色，左侧占位
      for (const text of lines) {
        left.push({ text: '', type: 'empty' })
        right.push({ text, type: 'added' })
      }
    } else if (change.removed) {
      // 删除行 → 左侧红色，右侧占位
      for (const text of lines) {
        left.push({ text, type: 'removed' })
        right.push({ text: '', type: 'empty' })
      }
    } else {
      // 未变更行 → 两侧都显示
      for (const text of lines) {
        left.push({ text, type: 'unchanged' })
        right.push({ text, type: 'unchanged' })
      }
    }
  }

  leftLines.value = left
  rightLines.value = right
}

watch(() => [props.oldContent, props.newContent, props.visible], () => {
  if (props.visible) {
    computeDiff()
  }
}, { immediate: true })
</script>

<style scoped>
.diff-viewer {
  border: 1px solid var(--color-bg-surface);
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-bg-primary);
}

.diff-title {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.diff-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
}
.diff-close:hover {
  background: var(--color-bg-primary);
  color: var(--color-danger);
}

.diff-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  max-height: 400px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.diff-pane {
  overflow-x: auto;
}

.diff-pane--old {
  border-right: 1px solid var(--color-bg-surface);
}

.diff-pane-header {
  padding: 2px var(--spacing-sm);
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-bg-primary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.diff-content {
  min-width: 100%;
}

.diff-line {
  display: flex;
  gap: 0;
  min-height: 18px;
  padding: 0 4px;
}

.diff-line-num {
  min-width: 32px;
  text-align: right;
  color: var(--color-text-secondary);
  opacity: 0.5;
  padding-right: 8px;
  user-select: none;
}

.diff-line-text {
  flex: 1;
  white-space: pre;
}

/* 删除行 — 左侧红色 */
.diff-line--removed {
  background: rgba(243, 139, 168, 0.2);
  border-left: 3px solid var(--color-danger);
}

/* 新增行 — 右侧绿色 */
.diff-line--added {
  background: rgba(166, 227, 161, 0.2);
  border-left: 3px solid var(--color-success);
}

/* 占位行 */
.diff-line--empty {
  background: transparent;
}

/* 未变更行 */
.diff-line--unchanged {
  background: transparent;
}
</style>
