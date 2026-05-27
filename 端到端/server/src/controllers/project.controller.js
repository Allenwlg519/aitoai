/**
 * 项目控制器
 * 职责: 处理项目相关的 WebSocket 消息（导入项目、文件 CRUD、目录遍历）
 *       不包含业务逻辑，仅做请求转发
 */

const projectService = require('../services/project.service');

/**
 * 处理 project:import 消息 — 导入本地目录作为项目
 * @param {object} payload - { dirPath }
 * @param {string} sessionId
 * @returns {Promise<object>} { name, rootDir, fileTree }
 */
async function handleImport(payload, sessionId) {
  return projectService.importProject(sessionId, payload.dirPath);
}

/**
 * 处理 project:read 消息 — 读取文件内容
 * @param {object} payload - { filePath }
 * @param {string} sessionId
 * @returns {Promise<object>} { content, language, size, path }
 */
async function handleRead(payload, sessionId) {
  return projectService.readFile(sessionId, payload.filePath);
}

/**
 * 处理 project:write 消息 — 写入文件内容
 * @param {object} payload - { filePath, content }
 * @param {string} sessionId
 * @returns {Promise<object>} { success, size }
 */
async function handleWrite(payload, sessionId) {
  return projectService.writeFile(sessionId, payload.filePath, payload.content);
}

/**
 * 处理 project:delete 消息 — 删除文件
 * @param {object} payload - { filePath }
 * @param {string} sessionId
 * @returns {Promise<object>} { success }
 */
async function handleDelete(payload, sessionId) {
  return projectService.deleteFile(sessionId, payload.filePath);
}

/**
 * 处理 project:tree 消息 — 获取文件树
 * @param {object} payload - { dirPath }
 * @param {string} sessionId
 * @returns {Promise<object>} 文件树节点数组
 */
async function handleTree(payload, sessionId) {
  return projectService.getFileTree(sessionId, payload.dirPath);
}

module.exports = {
  handleImport,
  handleRead,
  handleWrite,
  handleDelete,
  handleTree,
};
