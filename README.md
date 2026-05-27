# 超级个体 - 全栈AI Agent平台

一个AI驱动的全栈应用生成平台，只需输入自然语言需求，即可自动生成完整的React + Node.js应用。

## 功能特性

- **需求解析**: 自动将自然语言需求拆解为结构化任务
- **架构设计**: 输出技术栈、数据库表设计、API列表和Mermaid流程图
- **代码生成**: 自动生成React前端和Node/Express后端代码
- **一键部署**: 自动安装依赖并启动服务
- **实时进度**: WebSocket实时推送生成进度
- **Docker支持**: 支持Docker容器化部署

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **WebSocket**: ws
- **容器化**: Docker + Docker Compose

## 快速开始

### 方式一：使用npm脚本

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install

# 启动应用（同时启动前后端）
cd .. && npm start
```

### 方式二：使用Docker

```bash
# 构建并启动容器
docker-compose up --build
```

## 访问地址

- 前端应用: http://localhost:3000
- 后端API: http://localhost:5000

## API接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/parse` | POST | 解析需求，拆分成结构化任务 |
| `/api/design` | POST | 架构设计，输出技术栈和API |
| `/api/generate` | POST | 生成代码文件 |
| `/api/deploy` | POST | 部署应用并启动服务 |
| `/api/deploy/stop/:taskId` | POST | 停止指定任务的服务 |
| `/api/deploy/feedback` | POST | 提交用户反馈 |

## 使用示例

1. 在首页输入项目需求，例如："做一个待办系统"
2. 点击"开始生成"按钮
3. 等待系统完成：
   - 需求解析（步骤1）
   - 架构设计（步骤2）
   - 代码生成（步骤3）
   - 部署启动（步骤4）
4. 完成后会显示预览链接

## 项目结构

```
super-individual/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── routes/       # API路由
│   │   ├── server.ts     # 服务器入口
│   │   └── database.ts   # 数据库操作
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── App.tsx       # 主应用组件
│   │   └── App.css       # 样式文件
│   ├── package.json
│   └── tsconfig.json
├── generated/            # 生成的项目代码
├── docker-compose.yml    # Docker配置
└── package.json          # 根目录配置
```

## 支持的需求类型

- **待办系统**: 包含待办事项的增删改查功能
- **博客系统**: 包含文章、分类、标签管理
- **电商系统**: 包含商品、订单、购物车功能
- **通用应用**: 默认生成基础CRUD应用

## 许可证

MIT