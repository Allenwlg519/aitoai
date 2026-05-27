/**
 * 应用入口
 * 职责: 创建 Vue 应用实例，挂载 Pinia 状态管理、路由、全局样式
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
