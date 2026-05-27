<!--
  状态指示点
  职责: 用不同颜色圆点表示连接或运行状态
-->
<template>
  <span :class="['status-dot', `status-dot--${status}`]"></span>
</template>

<script setup>
defineProps({
  status: { type: String, default: 'inactive' },
})
</script>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot--active {
  background-color: var(--color-success);
  box-shadow: 0 0 4px var(--color-success);
}
.status-dot--inactive {
  background-color: var(--color-text-secondary);
}
.status-dot--warning {
  background-color: var(--color-warning);
}
.status-dot--error {
  background-color: var(--color-danger);
}
</style>
