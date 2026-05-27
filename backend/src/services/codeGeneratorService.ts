import fs from 'fs';
import path from 'path';
import { ProjectModel } from '../database/projectModel';
import { DoubaoService, createDoubaoService } from './doubaoService';
import { logger, createLogger } from '../utils';
import { config } from '../config';

interface FileContent {
  path: string;
  content: string;
}

interface GeneratedCode {
  files: FileContent[];
  frontendUrl?: string;
  backendUrl?: string;
}

interface DesignOutput {
  techStack: {
    frontend: string;
    backend: string;
    database: string;
  };
}

export class CodeGeneratorService {
  private doubaoService: DoubaoService;
  private projectLogger: ReturnType<typeof createLogger>;
  private static nextPort = 4000;

  constructor(doubaoService?: DoubaoService) {
    this.doubaoService = doubaoService || createDoubaoService();
    this.projectLogger = createLogger('CodeGenerator');
  }

  static getNextPort(): number {
    return CodeGeneratorService.nextPort++;
  }

  async generateCode(projectId: string): Promise<GeneratedCode> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    const designOutput = project.architecture
      ? JSON.parse(project.architecture)
      : { techStack: { frontend: 'React', backend: 'Express', database: 'MySQL' } };

    const projectDir = path.join(config.project.outputDir, projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'frontend'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'backend'), { recursive: true });

    const files: FileContent[] = [];

    if (config.doubao.apiKey) {
      try {
        const result = await this.doubaoService.generateCode(project.requirements, designOutput);
        const cleanResult = this.extractJsonFromMarkdown(result);
        const parsed = JSON.parse(cleanResult);

        if (parsed.files && Array.isArray(parsed.files)) {
          for (const file of parsed.files) {
            const filePath = path.join(projectDir, file.path);
            const fileDir = path.dirname(filePath);
            fs.mkdirSync(fileDir, { recursive: true });
            fs.writeFileSync(filePath, file.content);
            files.push({ path: file.path, content: file.content });
          }
        }
      } catch (error) {
        this.projectLogger.error('AI代码生成失败，使用默认模板', error);
        await this.generateDefaultCode(projectDir, files);
      }
    } else {
      this.projectLogger.warn('未配置豆包API密钥，使用默认代码模板');
      await this.generateDefaultCode(projectDir, files);
    }

    await ProjectModel.update(projectId, {
      code_files: JSON.stringify(files),
      status: 'generated'
    });

    this.projectLogger.info('代码生成完成', { projectId, fileCount: files.length });

    return { files };
  }

  private async generateDefaultCode(projectDir: string, files: FileContent[]): Promise<void> {
    const backendDir = path.join(projectDir, 'backend');
    const frontendDir = path.join(projectDir, 'frontend');

    const backendPackage = {
      name: 'app-backend',
      version: '1.0.0',
      scripts: { start: 'node server.js' },
      dependencies: { express: '^4.18.2', cors: '^2.8.5', mysql2: '^3.6.0' }
    };

    fs.writeFileSync(
      path.join(backendDir, 'package.json'),
      JSON.stringify(backendPackage, null, 2)
    );
    files.push({
      path: 'backend/package.json',
      content: JSON.stringify(backendPackage, null, 2)
    });

    const backendServer = `const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'app_db'
});

pool.getConnection().catch(console.error);

app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.json({ id: result.insertId, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    await pool.query(
      'UPDATE items SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;

    fs.writeFileSync(path.join(backendDir, 'server.js'), backendServer);
    files.push({ path: 'backend/server.js', content: backendServer });

    const dbInit = `-- 创建数据库和表
CREATE DATABASE IF NOT EXISTS app_db;
USE app_db;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;

    fs.writeFileSync(path.join(backendDir, 'init.sql'), dbInit);
    files.push({ path: 'backend/init.sql', content: dbInit });

    const publicDir = path.join(frontendDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    const frontendPackage = {
      name: 'app-frontend',
      version: '1.0.0',
      scripts: { start: 'react-scripts start', build: 'react-scripts build' },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1',
        antd: '^5.12.0'
      },
      proxy: 'http://localhost:3001'
    };

    fs.writeFileSync(
      path.join(frontendDir, 'package.json'),
      JSON.stringify(frontendPackage, null, 2)
    );
    files.push({
      path: 'frontend/package.json',
      content: JSON.stringify(frontendPackage, null, 2)
    });

    fs.writeFileSync(
      path.join(publicDir, 'index.html'),
      '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
    );
    files.push({
      path: 'frontend/public/index.html',
      content: '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
    });

    const frontendApp = `import { useState, useEffect } from 'react';
import { List, Input, Button, Card } from 'antd';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetch(\`\${API_BASE_URL}/items\`)
      .then(res => res.json())
      .then(data => setItems(data.items || []));
  }, []);

  const addItem = () => {
    fetch(\`\${API_BASE_URL}/items\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    })
      .then(res => res.json())
      .then(item => {
        setItems([item, ...items]);
        setName('');
        setDescription('');
      });
  };

  const deleteItem = (id) => {
    fetch(\`\${API_BASE_URL}/items/\${id}\`, { method: 'DELETE' })
      .then(() => setItems(items.filter(i => i.id !== id)));
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>我的应用</h1>
      <div style={{ marginBottom: 20 }}>
        <Input
          placeholder="名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: 10 }}
        />
        <Input
          placeholder="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginRight: 10 }}
        />
        <Button type="primary" onClick={addItem}>添加</Button>
      </div>
      <List
        dataSource={items}
        renderItem={item => (
          <Card title={item.name} extra={
            <Button danger onClick={() => deleteItem(item.id)}>删除</Button>
          }>
            <p>{item.description}</p>
          </Card>
        )}
      />
    </div>
  );
}

export default App;`;

    fs.writeFileSync(path.join(frontendDir, 'src', 'App.js'), frontendApp);
    fs.mkdirSync(path.join(frontendDir, 'src'), { recursive: true });
    files.push({ path: 'frontend/src/App.js', content: frontendApp });

    const frontendIndex = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;

    fs.writeFileSync(path.join(frontendDir, 'src', 'index.js'), frontendIndex);
    files.push({ path: 'frontend/src/index.js', content: frontendIndex });

    const dockerfileBackend = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]`;

    fs.writeFileSync(path.join(backendDir, 'Dockerfile'), dockerfileBackend);
    files.push({ path: 'backend/Dockerfile', content: dockerfileBackend });

    const dockerfileFrontend = `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

    fs.writeFileSync(path.join(frontendDir, 'Dockerfile'), dockerfileFrontend);
    files.push({ path: 'frontend/Dockerfile', content: dockerfileFrontend });

    const dockerCompose = `version: '3.8'
services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: app_db
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DB_HOST: db
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: rootpassword
      DB_NAME: app_db
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  db_data:`;

    fs.writeFileSync(path.join(projectDir, 'docker-compose.yml'), dockerCompose);
    files.push({ path: 'docker-compose.yml', content: dockerCompose });

    const readme = `# ${path.basename(projectDir)}

一个使用 React + Express + MySQL 构建的全栈应用

## 快速启动

### 使用 Docker（推荐）

\`\`\`bash
docker-compose up -d
\`\`\`

### 手动启动

1. 安装依赖
\`\`\`bash
cd backend && npm install
cd ../frontend && npm install
\`\`\`

2. 启动后端
\`\`\`bash
cd backend && npm start
\`\`\`

3. 启动前端
\`\`\`bash
cd frontend && npm start
\`\`\`

## 技术栈

- 前端: React + TypeScript + Ant Design
- 后端: Node.js + Express
- 数据库: MySQL`;

    fs.writeFileSync(path.join(projectDir, 'README.md'), readme);
    files.push({ path: 'README.md', content: readme });
  }

  private extractJsonFromMarkdown(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }
}

export const createCodeGeneratorService = () => new CodeGeneratorService();
