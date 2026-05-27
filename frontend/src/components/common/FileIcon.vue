<!--
  文件类型图标
  职责: 根据文件扩展名显示对应的文件类型图标
-->
<template>
  <span class="file-icon">{{ icon }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fileName: { type: String, required: true },
})

const icon = computed(() => {
  const ext = props.fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    js: '🟨',
    ts: '🟦',
    vue: '🟩',
    html: '🟧',
    css: '🟪',
    json: '⬜',
    md: '📝',
    yaml: '📋',
    yml: '📋',
  }
  return iconMap[ext] || '📄'
})
</script>

<style scoped>
.file-icon {
  font-size: 14px;
  line-height: 1;
}
</style>
