<!--
  侧边栏
  职责: 左侧面板，包含文件树、项目导入（原生目录选择器）、工具切换
-->
<template>
  <aside class="app-sidebar">
    <div class="sidebar-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="sidebar-content">

      <!-- ====== 文件标签页 ====== -->
      <template v-if="activeTab === 'files'">

        <!-- 加载中 -->
        <div v-if="projectStore.loading" class="loading-area">
          <p>正在读取项目文件...</p>
        </div>

        <!-- 未导入项目 → 显示导入按钮 -->
        <div v-else-if="!projectStore.hasProject" class="import-area">
          <p class="import-hint">选择本地目录作为项目</p>
          <button class="import-btn" @click="openDirPicker">
            📂 选择项目目录
          </button>
          <button class="import-btn import-btn--secondary" @click="openFilePicker">
            📁 上传文件
          </button>
          <p class="import-note">
            浏览器将打开文件选择器，选择项目根目录或上传文件即可
          </p>
          <!-- 隐藏的目录选择器 -->
          <input
            ref="dirInputRef"
            type="file"
            webkitdirectory
            style="display:none"
            @change="onDirSelected"
          />
          <!-- 隐藏的文件选择器 -->
          <input
            ref="fileInputRef"
            type="file"
            multiple
            style="display:none"
            @change="onFileSelected"
          />
        </div>

        <!-- 已导入项目 → 显示文件树 -->
        <div v-else class="project-area">
          <div class="project-header">
            <span>{{ projectStore.projectName }}</span>
            <button class="btn-reimport" title="切换项目" @click="resetProject">↻</button>
          </div>

          <div v-if="projectStore.fileTree.length === 0" class="tree-empty">
            项目中没有可显示的文件
          </div>

          <div v-else class="tree-container">
            <ProjectTree
              :tree="projectStore.fileTree"
              @select="handleFileSelect"
            />
          </div>
        </div>
      </template>

      <!-- ====== 工具标签页 ====== -->
      <template v-if="activeTab === 'tools'">
        <div class="tools-placeholder">
          <p>工具面板（待开发）</p>
        </div>
      </template>

    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../../stores/project'
import ProjectTree from '../project/ProjectTree.vue'

const projectStore = useProjectStore()

const tabs = [
  { key: 'files', label: '文件' },
  { key: 'tools', label: '工具' },
]
const activeTab = ref('files')
const dirInputRef = ref(null)
const fileInputRef = ref(null)

function openDirPicker() {
  dirInputRef.value?.click()
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function onDirSelected(event) {
  const fileList = event.target.files
  if (!fileList || fileList.length === 0) return

  await projectStore.importFromFileList(fileList)
  // 重置 input 以允许重复选择相同目录
  event.target.value = ''
}

async function onFileSelected(event) {
  const fileList = event.target.files
  if (!fileList || fileList.length === 0) return

  await projectStore.importFromFileList(fileList)
  // 重置 input 以允许重复选择相同文件
  event.target.value = ''
}

function resetProject() {
  projectStore.reset()
}

function handleFileSelect(filePath) {
  projectStore.openFile(filePath)
}
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-bg-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-bg-surface);
  flex-shrink: 0;
}
.sidebar-tabs button {
  flex: 1;
  padding: var(--spacing-sm);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: color 0.15s, border-color 0.15s;
}
.sidebar-tabs button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

/* 加载中 */
.loading-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* 导入区域 */
.import-area {
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
}
.import-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}
.import-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s;
}
.import-btn:hover {
  opacity: 0.9;
}
.import-btn--secondary {
  margin-top: var(--spacing-sm);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-bg-surface);
}
.import-btn--secondary:hover {
  border-color: var(--color-accent);
}
.import-note {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
  opacity: 0.7;
}

/* 项目区域 */
.project-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.project-header {
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
.project-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: none;
  letter-spacing: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-reimport {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: 2px;
  border-radius: 3px;
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-reimport:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-surface);
}
.tree-container {
  flex: 1;
  overflow-y: auto;
}
.tree-empty {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: var(--spacing-xl);
}
.tools-placeholder {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: var(--spacing-xl);
}
</style>
