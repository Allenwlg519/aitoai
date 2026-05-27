import { Low } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils';

interface DataSchema {
  users: UserData[];
  projects: ProjectData[];
  feedback: FeedbackData[];
}

export interface UserData {
  id: number;
  email: string;
  password_hash: string;
  name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectData {
  id: string;
  user_id: number;
  name?: string;
  requirements: string;
  parsed_tasks?: string;
  architecture?: string;
  code_files?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackData {
  id: number;
  user_id?: number;
  project_id?: string;
  content: string;
  rating?: number;
  created_at: string;
}

let db: Low<DataSchema> | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    const dbPath = path.resolve(__dirname, '..', '..', config.database.path);
    const dataDir = path.dirname(dbPath);

    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('创建数据目录', { path: dataDir });
    }

    const defaultData: DataSchema = {
      users: [],
      projects: [],
      feedback: []
    };

    db = await JSONFilePreset<DataSchema>(dbPath, defaultData);

    logger.info('数据库连接成功', { path: dbPath });
  } catch (error) {
    logger.error('数据库初始化失败', error);
    throw error;
  }
};

export const getDb = (): Low<DataSchema> => {
  if (!db) {
    throw new Error('数据库未连接');
  }
  return db;
};

export const query = <T = any>(table: string, filter?: (item: any) => boolean): Promise<T[]> => {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }

    const tableData = db.data[table as keyof DataSchema] as T[] || [];
    if (filter) {
      resolve(tableData.filter(filter));
    } else {
      resolve(tableData);
    }
  });
};

export const execute = (table: string, operation: 'insert' | 'update' | 'delete', data: any, filter?: (item: any) => boolean): Promise<{ lastID: number; changes: number }> => {
  return new Promise(async (resolve) => {
    if (!db) {
      resolve({ lastID: 0, changes: 0 });
      return;
    }

    let changes = 0;
    let lastID = 0;

    if (operation === 'insert') {
      const items = db.data[table as keyof DataSchema] as any[];
      if (table === 'users' || table === 'feedback') {
        const maxId = items.length > 0 ? Math.max(...items.map((item: any) => item.id)) : 0;
        lastID = maxId + 1;
        data.id = lastID;
      }
      items.push(data);
      changes = 1;
    } else if (operation === 'update' && filter) {
      const items = db.data[table as keyof DataSchema] as any[];
      items.forEach((item: any, index: number) => {
        if (filter(item)) {
          items[index] = { ...item, ...data };
          changes++;
        }
      });
    } else if (operation === 'delete' && filter) {
      const items = db.data[table as keyof DataSchema] as any[];
      const initialLength = items.length;
      db.data[table as keyof DataSchema] = items.filter((item: any) => !filter(item)) as never;
      changes = initialLength - (db.data[table as keyof DataSchema] as any[]).length;
    }

    await db.write();
    resolve({ lastID, changes });
  });
};

export const closeDatabase = (): Promise<void> => {
  return Promise.resolve();
};
