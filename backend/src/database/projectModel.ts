import { query, execute } from './connection';
import { ProjectData } from './connection';

export interface Project {
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

export interface CreateProjectInput {
  id: string;
  user_id: number;
  requirements: string;
  name?: string;
  status?: string;
}

export interface UpdateProjectInput {
  name?: string;
  requirements?: string;
  parsed_tasks?: string;
  architecture?: string;
  code_files?: string;
  status?: string;
}

export class ProjectModel {
  static async findById(id: string): Promise<Project | null> {
    const rows = await query<ProjectData>('projects', (item) => item.id === id);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByUserId(user_id: number, limit: number = 20, offset: number = 0): Promise<Project[]> {
    const rows = await query<ProjectData>('projects', (item) => item.user_id === user_id);
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
               .slice(offset, offset + limit);
  }

  static async create(data: CreateProjectInput): Promise<Project | null> {
    const now = new Date().toISOString();
    const projectData: ProjectData = {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      requirements: data.requirements,
      status: data.status || 'created',
      created_at: now,
      updated_at: now
    };

    await execute('projects', 'insert', projectData);
    return this.findById(data.id);
  }

  static async update(id: string, data: UpdateProjectInput): Promise<Project | null> {
    const updates: Partial<ProjectData> = { updated_at: new Date().toISOString() };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.requirements) updates.requirements = data.requirements;
    if (data.parsed_tasks !== undefined) updates.parsed_tasks = data.parsed_tasks;
    if (data.architecture !== undefined) updates.architecture = data.architecture;
    if (data.code_files !== undefined) updates.code_files = data.code_files;
    if (data.status) updates.status = data.status;

    await execute('projects', 'update', updates, (item) => item.id === id);
    return this.findById(id);
  }

  static async delete(id: string): Promise<void> {
    await execute('projects', 'delete', {}, (item) => item.id === id);
  }
}
