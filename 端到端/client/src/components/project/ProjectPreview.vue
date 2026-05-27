<!--
  预览面板
  职责: 预览编译/渲染结果（如 HTML 预览、Markdown 渲染）
-->
<template>
  <div class="project-preview">
    <div class="preview-toolbar">
      <span>预览</span>
    </div>
    <div class="preview-content">
      <iframe
        v-if="src"
        :src="src"
        class="preview-iframe"
        sandbox="allow-scripts"
      />
      <p v-else class="preview-empty">暂无预览内容</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  src: { type: String, default: '' },
})
</script>

<style scoped>
.project-preview {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-bg-surface);
}
.preview-toolbar {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-bg-surface);
}
.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}
.preview-empty {
  color: var(--color-text-secondary);
}
</style>
