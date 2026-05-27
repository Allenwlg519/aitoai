/**
 * 路由配置
 * 职责: 定义应用的路由规则，默认跳转到 Agent 工作台
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AgentView from '../views/AgentView.vue'
import ProjectView from '../views/ProjectView.vue'

const routes = [
  {
    path: '/',
    redirect: '/agent',
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/agent',
    name: 'agent',
    component: AgentView,
  },
  {
    path: '/project',
    name: 'project',
    component: ProjectView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
