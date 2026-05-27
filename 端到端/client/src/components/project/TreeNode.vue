<template>
  <div class="tree-node">
    <div class="tree-node__row" @click="toggle">
      <span v-if="node.type === 'directory'" class="tree-node__expand">
        <span v-if="node.children?.length" :class="['expand-icon', { expanded: isExpanded }]">▶</span>
        <span v-else class="expand-placeholder">·</span>
      </span>
      <span v-else class="tree-node__expand expand-placeholder"></span>
      <span class="tree-node__icon">{{ getFileIcon(node.name) }}</span>
      <span class="tree-node__name">{{ node.name }}</span>
    </div>
    <div v-if="node.type === 'directory' && isExpanded" class="tree-node__children">
      <TreeNode
        v-for="child in node.children"
        :key="child.name + child.path"
        :node="child"
        @select="(path) => emit('select', path)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  expanded: { type: Boolean, default: undefined },
})
const emit = defineEmits(['select'])

const isExpanded = ref(false)

watch(() => props.expanded, (val) => {
  if (val !== undefined) {
    isExpanded.value = val
  }
}, { immediate: true })

function toggle() {
  if (props.node.type === 'directory') {
    isExpanded.value = !isExpanded.value
  } else {
    emit('select', props.node.path)
  }
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  const icons = {
    js: '📦',
    jsx: '📦',
    ts: '📘',
    tsx: '📘',
    vue: '💚',
    html: '🌐',
    css: '🎨',
    scss: '🎨',
    json: '📋',
    md: '📝',
    txt: '📄',
    py: '🐍',
    go: '🟢',
    rs: '🦀',
    java: '☕',
    cpp: '⚙️',
    h: '⚙️',
    rb: '💎',
    php: '🐘',
    sql: '🗄️',
    xml: '📜',
    yml: '📋',
    yaml: '📋',
    dockerfile: '🐳',
    gitignore: '📤',
  }
  return icons[ext] || '📄'
}
</script>

<style scoped>
.tree-node__row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 2px;
  font-size: 13px;
  min-height: 22px;
}
.tree-node__row:hover {
  background-color: rgba(255, 255, 255, 0.04);
}
.tree-node__expand {
  width: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: var(--color-text-secondary);
}
.expand-icon {
  transition: transform 0.15s ease;
  color: var(--color-text-secondary);
}
.expand-icon.expanded {
  transform: rotate(90deg);
}
.expand-placeholder {
  color: transparent;
}
.tree-node__icon {
  width: 16px;
  text-align: center;
  font-size: 14px;
}
.tree-node__name {
  flex: 1;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node__children {
  padding-left: 12px;
}
</style>