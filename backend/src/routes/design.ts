import express, { Request, Response } from 'express';
import { updateProject } from '../database';
import { broadcastProgress } from '../server';
import { createDoubaoService } from '../services/doubaoService';

export const designRouter = express.Router();

interface DesignRequest {
  taskId: string;
  requirements: string;
}

interface DesignResponse {
  taskId: string;
  techStack: TechStack;
  database: DatabaseDesign;
  apis: API[];
  mermaidDiagram: string;
}

interface TechStack {
  frontend: string;
  backend: string;
  database: string;
}

interface Table {
  name: string;
  columns: Column[];
}

interface Column {
  name: string;
  type: string;
  primaryKey: boolean;
  nullable: boolean;
}

interface DatabaseDesign {
  tables: Table[];
}

interface API {
  method: string;
  endpoint: string;
  description: string;
  request?: object;
  response?: object;
}

const getDefaultDesign = (requirements: string): Omit<DesignResponse, 'taskId'> => {
  if (requirements.includes('待办') || requirements.includes('todo')) {
    return {
      techStack: {
        frontend: 'React 18 + TypeScript + Ant Design',
        backend: 'Node.js + Express + TypeScript',
        database: 'SQLite'
      },
      database: {
        tables: [
          {
            name: 'todos',
            columns: [
              { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
              { name: 'title', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'description', type: 'TEXT', primaryKey: false, nullable: true },
              { name: 'status', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'priority', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'createdAt', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'updatedAt', type: 'TEXT', primaryKey: false, nullable: false }
            ]
          }
        ]
      },
      apis: [
        {
          method: 'GET',
          endpoint: '/api/todos',
          description: '获取所有待办事项',
          response: { todos: [{ id: 1, title: 'string', description: 'string', status: 'string', priority: 'string', createdAt: 'string', updatedAt: 'string' }] }
        },
        {
          method: 'POST',
          endpoint: '/api/todos',
          description: '创建新待办事项',
          request: { title: 'string', description: 'string', status: 'string', priority: 'string' },
          response: { id: 1, title: 'string', description: 'string', status: 'string', priority: 'string' }
        },
        {
          method: 'PUT',
          endpoint: '/api/todos/:id',
          description: '更新待办事项',
          request: { title: 'string', description: 'string', status: 'string', priority: 'string' },
          response: { success: true }
        },
        {
          method: 'DELETE',
          endpoint: '/api/todos/:id',
          description: '删除待办事项',
          response: { success: true }
        }
      ],
      mermaidDiagram: `sequenceDiagram
    participant Client as React前端
    participant Server as Express后端
    participant DB as SQLite数据库

    Client->>Server: GET /api/todos
    Server->>DB: SELECT * FROM todos
    DB-->>Server: 返回待办列表
    Server-->>Client: 200 OK [{todos}]

    Client->>Server: POST /api/todos
    Server->>DB: INSERT INTO todos
    DB-->>Server: 返回新记录ID
    Server-->>Client: 201 Created {todo}

    Client->>Server: PUT /api/todos/:id
    Server->>DB: UPDATE todos SET ...
    DB-->>Server: 更新成功
    Server-->>Client: 200 OK {success}

    Client->>Server: DELETE /api/todos/:id
    Server->>DB: DELETE FROM todos WHERE id=?
    DB-->>Server: 删除成功
    Server-->>Client: 200 OK {success}`
    };
  }

  if (requirements.includes('博客') || requirements.includes('blog')) {
    return {
      techStack: {
        frontend: 'React 18 + TypeScript + Ant Design',
        backend: 'Node.js + Express + TypeScript',
        database: 'SQLite'
      },
      database: {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
              { name: 'title', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'content', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'categoryId', type: 'INTEGER', primaryKey: false, nullable: true },
              { name: 'createdAt', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'updatedAt', type: 'TEXT', primaryKey: false, nullable: false }
            ]
          },
          {
            name: 'categories',
            columns: [
              { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
              { name: 'name', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'slug', type: 'TEXT', primaryKey: false, nullable: false }
            ]
          },
          {
            name: 'tags',
            columns: [
              { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
              { name: 'name', type: 'TEXT', primaryKey: false, nullable: false },
              { name: 'slug', type: 'TEXT', primaryKey: false, nullable: false }
            ]
          },
          {
            name: 'post_tags',
            columns: [
              { name: 'postId', type: 'INTEGER', primaryKey: false, nullable: false },
              { name: 'tagId', type: 'INTEGER', primaryKey: false, nullable: false }
            ]
          }
        ]
      },
      apis: [
        { method: 'GET', endpoint: '/api/posts', description: '获取文章列表', response: { posts: [] } },
        { method: 'GET', endpoint: '/api/posts/:id', description: '获取单篇文章', response: { post: {} } },
        { method: 'POST', endpoint: '/api/posts', description: '创建文章', request: { title: 'string', content: 'string', categoryId: 'number' }, response: { post: {} } },
        { method: 'PUT', endpoint: '/api/posts/:id', description: '更新文章', response: { success: true } },
        { method: 'DELETE', endpoint: '/api/posts/:id', description: '删除文章', response: { success: true } },
        { method: 'GET', endpoint: '/api/categories', description: '获取分类列表', response: { categories: [] } },
        { method: 'GET', endpoint: '/api/tags', description: '获取标签列表', response: { tags: [] } }
      ],
      mermaidDiagram: `erDiagram
    posts ||--o{ categories : belongs_to
    posts ||--o{ post_tags : has
    tags ||--o{ post_tags : has

    posts {
      INTEGER id PK
      TEXT title
      TEXT content
      INTEGER categoryId FK
      TEXT createdAt
      TEXT updatedAt
    }

    categories {
      INTEGER id PK
      TEXT name
      TEXT slug
    }

    tags {
      INTEGER id PK
      TEXT name
      TEXT slug
    }

    post_tags {
      INTEGER postId FK
      INTEGER tagId FK
    }`
    };
  }

  return {
    techStack: {
      frontend: 'React 18 + TypeScript + Ant Design',
      backend: 'Node.js + Express + TypeScript',
      database: 'SQLite'
    },
    database: {
      tables: [
        {
          name: 'items',
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'name', type: 'TEXT', primaryKey: false, nullable: false },
            { name: 'description', type: 'TEXT', primaryKey: false, nullable: true },
            { name: 'createdAt', type: 'TEXT', primaryKey: false, nullable: false },
            { name: 'updatedAt', type: 'TEXT', primaryKey: false, nullable: false }
          ]
        }
      ]
    },
    apis: [
      { method: 'GET', endpoint: '/api/items', description: '获取列表', response: { items: [] } },
      { method: 'POST', endpoint: '/api/items', description: '创建', request: { name: 'string', description: 'string' }, response: { item: {} } },
      { method: 'PUT', endpoint: '/api/items/:id', description: '更新', response: { success: true } },
      { method: 'DELETE', endpoint: '/api/items/:id', description: '删除', response: { success: true } }
    ],
    mermaidDiagram: `flowchart TD
    A[客户端] -->|HTTP请求| B[Express服务器]
    B -->|SQL查询| C[(SQLite数据库)]
    C -->|返回数据| B
    B -->|JSON响应| A`
  };
};

const extractJsonFromMarkdown = (text: string): string => {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
};

const generateDesign = async (requirements: string): Promise<Omit<DesignResponse, 'taskId'>> => {
  const apiKey = process.env.DOUBAO_API_KEY;

  if (!apiKey) {
    console.log('未配置豆包API密钥，使用默认模板');
    return getDefaultDesign(requirements);
  }

  try {
    const doubao = createDoubaoService(apiKey);
    const result = await doubao.designArchitecture(requirements);
    const cleanResult = extractJsonFromMarkdown(result);
    const parsed = JSON.parse(cleanResult);
    return {
      techStack: parsed.techStack || getDefaultDesign(requirements).techStack,
      database: parsed.database || getDefaultDesign(requirements).database,
      apis: parsed.apis || getDefaultDesign(requirements).apis,
      mermaidDiagram: parsed.mermaidDiagram || getDefaultDesign(requirements).mermaidDiagram
    };
  } catch (error) {
    console.error('豆包AI调用失败:', error);
    return getDefaultDesign(requirements);
  }
};

designRouter.post('/', async (req: Request, res: Response) => {
  const { taskId, requirements } = req.body as DesignRequest;

  if (!taskId || !requirements) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  broadcastProgress(taskId, 2, 4, '正在进行架构设计...');

  const design = await generateDesign(requirements);

  await updateProject(taskId, { 
    status: 'designing', 
    progress: 50,
    designOutput: JSON.stringify(design)
  });

  broadcastProgress(taskId, 2, 4, '架构设计完成', design);

  res.json({ taskId, ...design });
});