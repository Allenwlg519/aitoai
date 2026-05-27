/**
 * 项目服务
 * 职责: 项目管理（导入项目目录、文件 CRUD、目录遍历）
 *       所有文件操作限制在已导入的项目根目录内，防止路径越权
 */
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * 对每个 session 存储其导入的项目根目录
 * Map<sessionId, rootDir>
 */
const sessionProjects = new Map();

/**
 * 安全解析路径 — 阻止目录遍历逃逸
 * @param {string} rootDir - 项目根目录
 * @param {string} targetPath - 用户请求的路径（相对或绝对）
 * @returns {string} 解析后的绝对路径
 */
function resolveSafePath(rootDir, targetPath) {
  // 如果 targetPath 是绝对路径，相对于 rootDir 重新解析
  const safePath = path.resolve(rootDir, targetPath);
  if (!safePath.startsWith(rootDir)) {
    throw new Error(`路径越权: ${targetPath} 不在项目目录内`);
  }
  return safePath;
}

/**
 * 递归扫描目录构造文件树
 * @param {string} dirPath - 目录绝对路径
 * @param {string} relativePath - 相对路径（递归用）
 * @param {number} depth - 当前递归深度
 * @returns {object[]} 文件树节点数组
 */
function scanDirectory(dirPath, relativePath = '', depth = 0) {
  const MAX_DEPTH = 8;
  if (depth > MAX_DEPTH) return [];

  const entries = [];
  try {
    const names = fs.readdirSync(dirPath);
    for (const name of names) {

      const fullPath = path.join(dirPath, name);
      const relPath = relativePath ? `${relativePath}/${name}` : name;
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const children = scanDirectory(fullPath, relPath, depth + 1);
        entries.push({
          name,
          type: 'directory',
          path: relPath,
          children,
        });
      } else if (stat.isFile()) {
        entries.push({
          name,
          type: 'file',
          path: relPath,
          size: stat.size,
        });
      }
    }
  } catch (err) {
    logger.warn('扫描目录失败', { dirPath, error: err.message });
  }

  // 目录排前面，文件排后面，各自按名称排序
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * 读取文件内容并检测语言类型
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const langMap = {
    '.js': 'javascript', '.ts': 'typescript', '.vue': 'vue',
    '.json': 'json', '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.md': 'markdown', '.py': 'python', '.rs': 'rust', '.go': 'go',
    '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c',
    '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.sh': 'bash',
    '.txt': 'plaintext', '.env': 'dotenv', '.sql': 'sql',
  };
  return langMap[ext] || 'plaintext';
}

/**
 * 导入项目 — 设置会话的项目根目录
 * @param {string} sessionId
 * @param {string} dirPath - 用户指定的项目目录路径
 * @returns {object} { name, rootDir, fileTree }
 */
async function importProject(sessionId, dirPath) {
  const resolvedRoot = path.resolve(dirPath);

  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }
  if (!fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`路径不是目录: ${dirPath}`);
  }

  sessionProjects.set(sessionId, resolvedRoot);

  const fileTree = scanDirectory(resolvedRoot);
  const projectName = path.basename(resolvedRoot);

  logger.info('项目已导入', { sessionId, projectName, rootDir: resolvedRoot });

  return {
    name: projectName,
    rootDir: resolvedRoot,
    fileTree,
  };
}

/**
 * 获取文件树
 * @param {string} sessionId
 * @param {string} dirPath - 可选，相对于项目根的目录路径
 * @returns {object[]} 文件树节点数组
 */
async function getFileTree(sessionId, dirPath = '') {
  const rootDir = sessionProjects.get(sessionId);
  if (!rootDir) throw new Error('未导入项目');

  const targetDir = dirPath ? resolveSafePath(rootDir, dirPath) : rootDir;
  return scanDirectory(targetDir);
}

/**
 * 读取文件内容
 * @param {string} sessionId
 * @param {string} filePath - 相对于项目根的文件路径
 * @returns {object} { content, language, size, path }
 */
async function readFile(sessionId, filePath) {
  const rootDir = sessionProjects.get(sessionId);
  if (!rootDir) throw new Error('未导入项目');

  const safePath = resolveSafePath(rootDir, filePath);

  if (!fs.existsSync(safePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  if (fs.statSync(safePath).isDirectory()) {
    throw new Error(`路径是目录: ${filePath}`);
  }

  const content = fs.readFileSync(safePath, 'utf-8');
  const stat = fs.statSync(safePath);

  return {
    path: filePath,
    content,
    language: detectLanguage(safePath),
    size: stat.size,
  };
}

/**
 * 写入文件内容
 * @param {string} sessionId
 * @param {string} filePath - 相对于项目根的文件路径
 * @param {string} content - 文件内容
 * @returns {object} { success, size }
 */
async function writeFile(sessionId, filePath, content) {
  const rootDir = sessionProjects.get(sessionId);
  if (!rootDir) throw new Error('未导入项目');

  const safePath = resolveSafePath(rootDir, filePath);

  // 自动创建父目录
  const parentDir = path.dirname(safePath);
  fs.mkdirSync(parentDir, { recursive: true });

  fs.writeFileSync(safePath, content, 'utf-8');
  const stat = fs.statSync(safePath);

  logger.info('文件已写入', { sessionId, filePath, size: stat.size });
  return { success: true, size: stat.size };
}

/**
 * 删除文件或目录
 * @param {string} sessionId
 * @param {string} filePath
 * @returns {object} { success }
 */
async function deleteFile(sessionId, filePath) {
  const rootDir = sessionProjects.get(sessionId);
  if (!rootDir) throw new Error('未导入项目');

  const safePath = resolveSafePath(rootDir, filePath);

  if (!fs.existsSync(safePath)) {
    throw new Error(`路径不存在: ${filePath}`);
  }

  const stat = fs.statSync(safePath);
  if (stat.isDirectory()) {
    fs.rmdirSync(safePath);
  } else {
    fs.unlinkSync(safePath);
  }

  logger.info('文件已删除', { sessionId, filePath });
  return { success: true };
}

/**
 * 清理会话的项目数据
 * @param {string} sessionId
 */
function removeSession(sessionId) {
  sessionProjects.delete(sessionId);
}

module.exports = {
  importProject,
  getFileTree,
  readFile,
  writeFile,
  deleteFile,
  removeSession,
};
