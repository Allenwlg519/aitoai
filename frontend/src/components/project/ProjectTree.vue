<template>
  <div class="project-tree">
    <div class="tree-header">
      <span class="tree-title">资源管理器</span>
      <button class="tree-action" @click="toggleAll">
        {{ expandedAll ? '▼' : '▲' }}
      </button>
    </div>
    <div class="tree-content">
      <TreeNode
        v-for="node in tree"
        :key="node.name + node.path"
        :node="node"
        :expanded="expandedAll"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  tree: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

const expandedAll = ref(false)

function toggleAll() {
  expandedAll.value = !expandedAll.value
}

function handleSelect(path) {
  emit('select', path)
}
</script>

<style scoped>
.project-tree {
  font-size: 13px;
  user-select: none;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-bg-surface);
  flex-shrink: 0;
}
.tree-action {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
}
.tree-action:hover {
  background-color: var(--color-bg-surface);
}
.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
</style>