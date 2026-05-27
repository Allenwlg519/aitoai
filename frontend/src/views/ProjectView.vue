<!--
  项目管理页
  职责: 项目文件浏览、代码编辑、预览输出
  布局: [文件树 | 代码编辑器 | 预览面板]
-->
<template>
  <div class="project-view">
    <div v-if="!projectStore.hasProject" class="project-empty">
      <h2>欢迎使用项目管理</h2>
      <p>请先在左侧边栏「文件」标签中导入一个本地目录作为项目</p>
    </div>

    <template v-else>
      <div class="project-tree-panel">
        <div class="panel-header">文件</div>
        <div class="panel-body">
          <ProjectTree
            :tree="projectStore.fileTree"
            @select="handleFileSelect"
          />
        </div>
      </div>
      <ProjectEditor />
      <ProjectPreview />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '../stores/project'
import ProjectTree from '../components/project/ProjectTree.vue'
import ProjectEditor from '../components/project/ProjectEditor.vue'
import ProjectPreview from '../components/project/ProjectPreview.vue'

const projectStore = useProjectStore()

onMounted(() => {
  projectStore.initSubscriptions()
})

onUnmounted(() => {
  projectStore.cleanupSubscriptions()
})

function handleFileSelect(filePath) {
  projectStore.openFile(filePath)
}
</script>

<style scoped>
.project-view {
  display: flex;
  height: 100%;
  gap: 0;
}
.project-view > * {
  flex: 1;
  min-width: 0;
}
.project-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  gap: var(--spacing-md);
}
.project-empty h2 {
  color: var(--color-text-primary);
}
.project-tree-panel {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-bg-surface);
  background: var(--color-bg-secondary);
  overflow: hidden;
}
.panel-header {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-bg-surface);
  flex-shrink: 0;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xs) 0;
}
</style>
