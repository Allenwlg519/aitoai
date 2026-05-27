import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { updateProject } from '../database';
import { broadcastProgress } from '../server';

export const generateRouter = express.Router();

interface GenerateRequest {
  taskId: string;
  requirements: string;
}

interface GenerateResponse {
  taskId: string;
  outputPath: string;
  filesGenerated: string[];
  filesContent: { path: string; content: string }[];
}

const generateTodoApp = (outputDir: string): { files: string[], filesContent: { path: string, content: string }[] } => {
  const files: string[] = [];
  const filesContent: { path: string, content: string }[] = [];

  const backendDir = path.join(outputDir, 'backend');
  const frontendDir = path.join(outputDir, 'frontend');
  const frontendSrcDir = path.join(frontendDir, 'src');
  const frontendPublicDir = path.join(frontendDir, 'public');

  fs.mkdirSync(backendDir, { recursive: true });
  fs.mkdirSync(frontendSrcDir, { recursive: true });
  fs.mkdirSync(frontendPublicDir, { recursive: true });

  const backendPackage = {
    name: 'todo-backend',
    version: '1.0.0',
    scripts: { start: 'node server.js' },
    dependencies: { express: '^4.18.2', cors: '^2.8.5' }
  };
  const backendPackageContent = JSON.stringify(backendPackage, null, 2);
  fs.writeFileSync(path.join(backendDir, 'package.json'), backendPackageContent);
  files.push('backend/package.json');
  filesContent.push({ path: 'backend/package.json', content: backendPackageContent });

  const backendServer = `const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

const initData = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ todos: [] }));
  }
};

const getData = () => {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

initData();

let nextId = 1;
const data = getData();
if (data.todos.length > 0) {
  nextId = Math.max(...data.todos.map(t => t.id)) + 1;
}

app.get('/api/todos', (req, res) => {
  const data = getData();
  res.json({ todos: data.todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post('/api/todos', (req, res) => {
  const { title, description, status = 'pending', priority = 'medium' } = req.body;
  const now = new Date().toISOString();
  const todo = { id: nextId++, title, description, status, priority, createdAt: now, updatedAt: now };
  const data = getData();
  data.todos.push(todo);
  saveData(data);
  res.json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;
  const data = getData();
  const todoIndex = data.todos.findIndex(t => t.id === parseInt(id));
  if (todoIndex !== -1) {
    data.todos[todoIndex] = {
      ...data.todos[todoIndex],
      title, description, status, priority,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const data = getData();
  data.todos = data.todos.filter(t => t.id !== parseInt(id));
  saveData(data);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;
  fs.writeFileSync(path.join(backendDir, 'server.js'), backendServer);
  files.push('backend/server.js');
  filesContent.push({ path: 'backend/server.js', content: backendServer });

  const frontendPackage = {
    name: 'todo-frontend',
    version: '1.0.0',
    scripts: { start: 'react-scripts start', build: 'react-scripts build' },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'react-scripts': '5.0.1', antd: '^5.12.0' },
    proxy: 'http://localhost:3001'
  };
  const frontendPackageContent = JSON.stringify(frontendPackage, null, 2);
  fs.writeFileSync(path.join(frontendDir, 'package.json'), frontendPackageContent);
  files.push('frontend/package.json');
  filesContent.push({ path: 'frontend/package.json', content: frontendPackageContent });

  const frontendIndexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>待办事项</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
  fs.writeFileSync(path.join(frontendPublicDir, 'index.html'), frontendIndexHtml);
  files.push('frontend/public/index.html');
  filesContent.push({ path: 'frontend/public/index.html', content: frontendIndexHtml });

  const frontendApp = `import { useState, useEffect } from 'react';
import { List, Input, Button, Select, Tag } from 'antd';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    fetch(\`\${API_BASE_URL}/todos\`)
      .then(res => res.json())
      .then(data => setTodos(data.todos));
  }, []);

  const addTodo = () => {
    fetch(\`\${API_BASE_URL}/todos\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, status, priority })
    }).then(res => res.json()).then(todo => {
      setTodos([todo, ...todos]);
      setTitle('');
      setDescription('');
    });
  };

  const updateTodo = (id, fields) => {
    fetch(\`\${API_BASE_URL}/todos/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    }).then(() => {
      setTodos(todos.map(t => t.id === id ? { ...t, ...fields } : t));
    });
  };

  const deleteTodo = (id) => {
    fetch(\`\${API_BASE_URL}/todos/\${id}\`, { method: 'DELETE' })
      .then(() => setTodos(todos.filter(t => t.id !== id)));
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>待办事项</h1>
      <div style={{ marginBottom: 20 }}>
        <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginRight: 10 }} />
        <Input placeholder="描述" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginRight: 10 }} />
        <Select value={status} onChange={setStatus} style={{ width: 100, marginRight: 10 }}>
          <Select.Option value="pending">待办</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
        </Select>
        <Select value={priority} onChange={setPriority} style={{ width: 100, marginRight: 10 }}>
          <Select.Option value="high">高</Select.Option>
          <Select.Option value="medium">中</Select.Option>
          <Select.Option value="low">低</Select.Option>
        </Select>
        <Button type="primary" onClick={addTodo}>添加</Button>
      </div>
      <List
        dataSource={todos}
        renderItem={todo => (
          <List.Item actions={[
            <Button onClick={() => updateTodo(todo.id, { status: todo.status === 'pending' ? 'completed' : 'pending' })}>
              {todo.status === 'pending' ? '完成' : '撤销'}
            </Button>,
            <Button danger onClick={() => deleteTodo(todo.id)}>删除</Button>
          ]}>
            <List.Item.Meta
              title={todo.title}
              description={todo.description}
            />
            <Tag color={todo.status === 'completed' ? 'green' : 'yellow'}>{todo.status === 'completed' ? '已完成' : '待办'}</Tag>
            <Tag color={todo.priority === 'high' ? 'red' : todo.priority === 'medium' ? 'orange' : 'blue'}>
              {todo.priority === 'high' ? '高优先级' : todo.priority === 'medium' ? '中优先级' : '低优先级'}
            </Tag>
          </List.Item>
        )}
      />
    </div>
  );
}

export default App;`;
  fs.writeFileSync(path.join(frontendSrcDir, 'App.js'), frontendApp);
  files.push('frontend/src/App.js');
  filesContent.push({ path: 'frontend/src/App.js', content: frontendApp });

  const frontendIndex = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
  fs.writeFileSync(path.join(frontendSrcDir, 'index.js'), frontendIndex);
  files.push('frontend/src/index.js');
  filesContent.push({ path: 'frontend/src/index.js', content: frontendIndex });

  return { files, filesContent };
};

const generateBlogApp = (outputDir: string): { files: string[], filesContent: { path: string, content: string }[] } => {
  const files: string[] = [];
  const filesContent: { path: string, content: string }[] = [];

  const backendDir = path.join(outputDir, 'backend');
  const frontendDir = path.join(outputDir, 'frontend');
  const frontendSrcDir = path.join(frontendDir, 'src');
  const frontendPublicDir = path.join(frontendDir, 'public');

  fs.mkdirSync(backendDir, { recursive: true });
  fs.mkdirSync(frontendSrcDir, { recursive: true });
  fs.mkdirSync(frontendPublicDir, { recursive: true });

  const backendPackage = {
    name: 'blog-backend',
    version: '1.0.0',
    scripts: { start: 'node server.js' },
    dependencies: { express: '^4.18.2', cors: '^2.8.5' }
  };
  const backendPackageContent = JSON.stringify(backendPackage, null, 2);
  fs.writeFileSync(path.join(backendDir, 'package.json'), backendPackageContent);
  files.push('backend/package.json');
  filesContent.push({ path: 'backend/package.json', content: backendPackageContent });

  const backendServer = `const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

const initData = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ posts: [], categories: [] }));
  }
};

const getData = () => {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

initData();

let nextPostId = 1;
let nextCategoryId = 1;
const data = getData();
if (data.posts.length > 0) nextPostId = Math.max(...data.posts.map(p => p.id)) + 1;
if (data.categories.length > 0) nextCategoryId = Math.max(...data.categories.map(c => c.id)) + 1;

app.get('/api/posts', (req, res) => {
  const data = getData();
  res.json({ posts: data.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.get('/api/posts/:id', (req, res) => {
  const data = getData();
  const post = data.posts.find(p => p.id === parseInt(req.params.id));
  res.json({ post });
});

app.post('/api/posts', (req, res) => {
  const { title, content, categoryId } = req.body;
  const now = new Date().toISOString();
  const post = { id: nextPostId++, title, content, categoryId, createdAt: now, updatedAt: now };
  const data = getData();
  data.posts.push(post);
  saveData(data);
  res.json(post);
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, categoryId } = req.body;
  const data = getData();
  const postIndex = data.posts.findIndex(p => p.id === parseInt(id));
  if (postIndex !== -1) {
    data.posts[postIndex] = {
      ...data.posts[postIndex],
      title, content, categoryId,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/posts/:id', (req, res) => {
  const data = getData();
  data.posts = data.posts.filter(p => p.id !== parseInt(req.params.id));
  saveData(data);
  res.json({ success: true });
});

app.get('/api/categories', (req, res) => {
  const data = getData();
  res.json({ categories: data.categories });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;
  fs.writeFileSync(path.join(backendDir, 'server.js'), backendServer);
  files.push('backend/server.js');
  filesContent.push({ path: 'backend/server.js', content: backendServer });

  const frontendPackage = {
    name: 'blog-frontend',
    version: '1.0.0',
    scripts: { start: 'react-scripts start', build: 'react-scripts build' },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'react-scripts': '5.0.1', antd: '^5.12.0' },
    proxy: 'http://localhost:3001'
  };
  const frontendPackageContent = JSON.stringify(frontendPackage, null, 2);
  fs.writeFileSync(path.join(frontendDir, 'package.json'), frontendPackageContent);
  files.push('frontend/package.json');
  filesContent.push({ path: 'frontend/package.json', content: frontendPackageContent });

  const frontendIndexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>我的博客</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
  fs.writeFileSync(path.join(frontendPublicDir, 'index.html'), frontendIndexHtml);
  files.push('frontend/public/index.html');
  filesContent.push({ path: 'frontend/public/index.html', content: frontendIndexHtml });

  const frontendApp = `import { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Form, Input } from 'antd';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [posts, setPosts] = useState([]);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(\`\${API_BASE_URL}/posts\`)
      .then(res => res.json())
      .then(data => setPosts(data.posts));
  }, []);

  const handleSubmit = (values) => {
    fetch(\`\${API_BASE_URL}/posts\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    }).then(res => res.json()).then(post => {
      setPosts([post, ...posts]);
      setVisible(false);
      form.resetFields();
    });
  };

  const deletePost = (id) => {
    fetch(\`\${API_BASE_URL}/posts/\${id}\`, { method: 'DELETE' })
      .then(() => setPosts(posts.filter(p => p.id !== id)));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>我的博客</h1>
        <Button type="primary" onClick={() => setVisible(true)}>写文章</Button>
      </div>
      <List grid={{ gutter: 16, column: 3 }} dataSource={posts} renderItem={post => (
        <Card title={post.title} extra={<Button danger onClick={() => deletePost(post.id)}>删除</Button>}>
          <p>{post.content.substring(0, 100)}...</p>
          <p style={{ color: '#666', fontSize: 12 }}>{post.createdAt}</p>
        </Card>
      )}/>
      <Modal title="写文章" open={visible} onCancel={() => setVisible(false)} footer={null}>
        <Form form={form} onFinish={handleSubmit}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">发布</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default App;`;
  fs.writeFileSync(path.join(frontendSrcDir, 'App.js'), frontendApp);
  files.push('frontend/src/App.js');
  filesContent.push({ path: 'frontend/src/App.js', content: frontendApp });

  const frontendIndex = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
  fs.writeFileSync(path.join(frontendSrcDir, 'index.js'), frontendIndex);
  files.push('frontend/src/index.js');
  filesContent.push({ path: 'frontend/src/index.js', content: frontendIndex });

  return { files, filesContent };
};

const generateDefaultApp = (outputDir: string): { files: string[], filesContent: { path: string, content: string }[] } => {
  const files: string[] = [];
  const filesContent: { path: string, content: string }[] = [];

  const backendDir = path.join(outputDir, 'backend');
  const frontendDir = path.join(outputDir, 'frontend');
  const frontendSrcDir = path.join(frontendDir, 'src');
  const frontendPublicDir = path.join(frontendDir, 'public');

  fs.mkdirSync(backendDir, { recursive: true });
  fs.mkdirSync(frontendSrcDir, { recursive: true });
  fs.mkdirSync(frontendPublicDir, { recursive: true });

  const backendPackage = {
    name: 'app-backend',
    version: '1.0.0',
    scripts: { start: 'node server.js' },
    dependencies: { express: '^4.18.2', cors: '^2.8.5' }
  };
  const backendPackageContent = JSON.stringify(backendPackage, null, 2);
  fs.writeFileSync(path.join(backendDir, 'package.json'), backendPackageContent);
  files.push('backend/package.json');
  filesContent.push({ path: 'backend/package.json', content: backendPackageContent });

  const backendServer = `const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

const initData = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ items: [] }));
  }
};

const getData = () => {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

initData();

let nextId = 1;
const data = getData();
if (data.items.length > 0) nextId = Math.max(...data.items.map(i => i.id)) + 1;

app.get('/api/items', (req, res) => {
  const data = getData();
  res.json({ items: data.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post('/api/items', (req, res) => {
  const { name, description } = req.body;
  const now = new Date().toISOString();
  const item = { id: nextId++, name, description, createdAt: now, updatedAt: now };
  const data = getData();
  data.items.push(item);
  saveData(data);
  res.json(item);
});

app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const data = getData();
  const itemIndex = data.items.findIndex(i => i.id === parseInt(id));
  if (itemIndex !== -1) {
    data.items[itemIndex] = {
      ...data.items[itemIndex],
      name, description,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/items/:id', (req, res) => {
  const data = getData();
  data.items = data.items.filter(i => i.id !== parseInt(req.params.id));
  saveData(data);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;
  fs.writeFileSync(path.join(backendDir, 'server.js'), backendServer);
  files.push('backend/server.js');
  filesContent.push({ path: 'backend/server.js', content: backendServer });

  const frontendPackage = {
    name: 'app-frontend',
    version: '1.0.0',
    scripts: { start: 'react-scripts start', build: 'react-scripts build' },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'react-scripts': '5.0.1', antd: '^5.12.0' },
    proxy: 'http://localhost:3001'
  };
  const frontendPackageContent = JSON.stringify(frontendPackage, null, 2);
  fs.writeFileSync(path.join(frontendDir, 'package.json'), frontendPackageContent);
  files.push('frontend/package.json');
  filesContent.push({ path: 'frontend/package.json', content: frontendPackageContent });

  const frontendIndexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>我的应用</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
  fs.writeFileSync(path.join(frontendPublicDir, 'index.html'), frontendIndexHtml);
  files.push('frontend/public/index.html');
  filesContent.push({ path: 'frontend/public/index.html', content: frontendIndexHtml });

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
      .then(data => setItems(data.items));
  }, []);

  const addItem = () => {
    fetch(\`\${API_BASE_URL}/items\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    }).then(res => res.json()).then(item => {
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
        <Input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} style={{ marginRight: 10 }} />
        <Input placeholder="描述" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginRight: 10 }} />
        <Button type="primary" onClick={addItem}>添加</Button>
      </div>
      <List dataSource={items} renderItem={item => (
        <Card title={item.name} extra={<Button danger onClick={() => deleteItem(item.id)}>删除</Button>}>
          <p>{item.description}</p>
          <p style={{ color: '#666', fontSize: 12 }}>{item.createdAt}</p>
        </Card>
      )}/>
    </div>
  );
}

export default App;`;
  fs.writeFileSync(path.join(frontendSrcDir, 'App.js'), frontendApp);
  files.push('frontend/src/App.js');
  filesContent.push({ path: 'frontend/src/App.js', content: frontendApp });

  const frontendIndex = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
  fs.writeFileSync(path.join(frontendSrcDir, 'index.js'), frontendIndex);
  files.push('frontend/src/index.js');
  filesContent.push({ path: 'frontend/src/index.js', content: frontendIndex });

  return { files, filesContent };
};

generateRouter.post('/', async (req: Request, res: Response) => {
  const { taskId, requirements } = req.body as GenerateRequest;

  if (!taskId || !requirements) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  broadcastProgress(taskId, 3, 4, '正在生成代码...');

  const outputDir = path.join(__dirname, '..', '..', 'generated', taskId);

  let result: { files: string[], filesContent: { path: string, content: string }[] };

  if (requirements.includes('待办') || requirements.includes('todo')) {
    result = generateTodoApp(outputDir);
  } else if (requirements.includes('博客') || requirements.includes('blog')) {
    result = generateBlogApp(outputDir);
  } else {
    result = generateDefaultApp(outputDir);
  }

  await updateProject(taskId, { status: 'generating', progress: 60 });
  broadcastProgress(taskId, 3, 4, '代码生成完成', {
    filesGenerated: result.files,
    filesContent: result.filesContent
  });

  res.json({
    taskId,
    outputPath: outputDir,
    filesGenerated: result.files,
    filesContent: result.filesContent
  });
});
