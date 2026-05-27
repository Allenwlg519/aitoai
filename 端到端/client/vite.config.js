/**
 * Vite 构建配置
 * 职责: 配置开发服务器代理、Vue 插件、构建选项
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  server: {
    port: 5173,
    /** 代理 WebSocket 连接到后端 */
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
