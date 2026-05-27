<!--
  代码编辑器外壳
  职责: 封装代码编辑器（预留 Monaco Editor 集成点），
       显示当前打开的文件内容
-->
<template>
  <div class="project-editor">
    <div v-if="!hasFile" class="editor-placeholder">
      <p>选择一个文件开始编辑</p>
    </div>
    <div v-else class="editor-container">
      <div class="editor-tabs">
        <span class="editor-tab">{{ fileName }}</span>
      </div>
      <textarea
        class="editor-textarea"
        :value="content"
        @input="handleInput"
        spellcheck="false"
      ></textarea>
      <!-- TODO: 替换为 Monaco Editor -->
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'

const projectStore = useProjectStore()

const hasFile = computed(() => projectStore.hasFileOpen)
const fileName = computed(() => projectStore.currentFileName)
const content = computed(() => projectStore.currentContent)

function handleInput(event) {
  projectStore.updateContent(event.target.value)
}
</script>

<style scoped>
.project-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.editor-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.editor-tabs {
  display: flex;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-bg-surface);
}
.editor-tab {
  font-size: 12px;
  padding: 2px 8px;
  background-color: var(--color-bg-primary);
  border-radius: 2px 2px 0 0;
}
.editor-textarea {
  flex: 1;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: none;
  outline: none;
  resize: none;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  padding: var(--spacing-md);
  tab-size: 2;
}
</style>
