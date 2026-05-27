import { query, execute } from './connection';
import { UserData } from './connection';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  name?: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  password_hash?: string;
  name?: string;
  role?: string;
}

export class UserModel {
  static async findById(id: number): Promise<User | null> {
    const rows = await query<UserData>('users', (item) => item.id === id);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const rows = await query<UserData>('users', (item) => item.email === email);
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(data: CreateUserInput): Promise<User | null> {
    const now = new Date().toISOString();
    const userData: UserData = {
      id: 0,
      email: data.email,
      password_hash: data.password_hash,
      name: data.name,
      role: data.role || 'user',
      created_at: now,
      updated_at: now
    };

    const result = await execute('users', 'insert', userData);
    return this.findById(result.lastID);
  }

  static async update(id: number, data: UpdateUserInput): Promise<User | null> {
    const updates: Partial<UserData> = { updated_at: new Date().toISOString() };
    
    if (data.email) updates.email = data.email;
    if (data.password_hash) updates.password_hash = data.password_hash;
    if (data.name !== undefined) updates.name = data.name;
    if (data.role) updates.role = data.role;

    await execute('users', 'update', updates, (item) => item.id === id);
    return this.findById(id);
  }

  static async delete(id: number): Promise<void> {
    await execute('users', 'delete', {}, (item) => item.id === id);
  }
}
