/**
 * 项目状态管理 (Pinia)
 * 职责: 管理项目导入、文件树、当前打开的文件、项目配置
 *       支持通过 WS path 导入或浏览器 File API (webkitdirectory) 导入
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { subscribe } from '../api/ws'

export const useProjectStore = defineStore('project', () => {
  /** 项目名称 */
  const projectName = ref('')

  /** 项目根目录路径（后端用） */
  const rootDir = ref('')

  /** 项目文件树 */
  const fileTree = ref([])

  /** 是否已导入项目 */
  const hasProject = computed(() => !!projectName.value)

  /** 当前正在编辑的文件路径（相对于项目根） */
  const currentFilePath = ref(null)

  /** 当前文件内容 */
  const currentContent = ref('')

  /** 当前文件名（从路径中提取） */
  const currentFileName = computed(() => {
    if (!currentFilePath.value) return ''
    const parts = currentFilePath.value.split('/')
    return parts[parts.length - 1]
  })

  /** 是否有文件打开 */
  const hasFileOpen = computed(() => !!currentFilePath.value)

  /** 正在加载中 */
  const loading = ref(false)

  /** 文件内容缓存 Map<relativePath, string>（浏览器导入时预读） */
  const fileContentCache = ref(new Map())

  /** 防止重复订阅 */
  let _subscribed = false

  // ---- WebSocket 订阅 ----

  let unsubResult = null
  function initSubscriptions() {
    if (_subscribed) return
    _subscribed = true
    unsubResult = subscribe('project:result', (payload) => {
      const data = payload.data
      if (!data) return

      // 导入结果: 包含 fileTree
      if (data.fileTree) {
        projectName.value = data.name || ''
        rootDir.value = data.rootDir || ''
        fileTree.value = data.fileTree
        loading.value = false
        return
      }

      // 读取文件结果: 包含 content
      if (data.content !== undefined) {
        currentContent.value = data.content
        return
      }

      // 文件树结果: data 是数组
      if (Array.isArray(data)) {
        fileTree.value = data
      }
    })
  }

  function cleanupSubscriptions() {
    if (unsubResult) {
      unsubResult()
      unsubResult = null
    }
    _subscribed = false
  }

  // ---- 目录树构建（从 webkitRelativePath） ----

  /**
   * 从 webkitdirectory 的 FileList 构建文件树
   * @param {FileList} fileList
   * @param {string} projectName - 项目名称（用于计算相对路径）
   * @returns {object[]} 文件树节点
   */
  function buildTreeFromFileList(fileList, projectName = '') {
    const rootMap = {}

    for (const file of fileList) {
      const parts = file.webkitRelativePath.split('/')
      let current = rootMap

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (i === parts.length - 1) {
          // 文件：计算相对路径（去掉项目名前缀）
          let relativePath = file.webkitRelativePath
          if (projectName && relativePath.startsWith(projectName + '/')) {
            relativePath = relativePath.substring(projectName.length + 1)
          }
          current[part] = { __file: true, name: part, path: relativePath, file }
        } else {
          // 目录
          if (!current[part]) current[part] = { __dir: true, children: {} }
          current = current[part].children
        }
      }
    }

    return convertMapToTree(rootMap)
  }

  function convertMapToTree(map) {
    const dirs = []
    const files = []

    for (const key of Object.keys(map)) {
      const entry = map[key]
      if (entry.__dir) {
        dirs.push({
          name: key,
          type: 'directory',
          path: '', // computed below
          children: convertMapToTree(entry.children),
        })
      } else if (entry.__file) {
        files.push({
          name: entry.name,
          type: 'file',
          path: entry.path,
          size: entry.file.size,
        })
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name))
    files.sort((a, b) => a.name.localeCompare(b.name))

    // 为目录补全 path（从 children 中取第一个文件的 path 前缀）
    for (const dir of dirs) {
      dir.path = getDirPath(dir)
    }

    return [...dirs, ...files]
  }

  function getDirPath(dir) {
    if (dir.children.length > 0) {
      const first = dir.children[0]
      if (first.type === 'file') {
        return first.path.split('/').slice(0, -1).join('/')
      }
      return getDirPath(first)
    }
    return dir.name
  }

  // ---- Actions ----

  /**
   * 通过浏览器 File API 导入项目
   * 从 webkitdirectory 的 FileList 读取所有文件内容
   * @param {FileList} fileList - 来自 <input webkitdirectory> 或 <input multiple>
   */
  async function importFromFileList(fileList) {
    if (!fileList || fileList.length === 0) return

    loading.value = true
    reset()

    // 判断是否是目录选择（webkitRelativePath 包含路径）还是文件选择（只有文件名）
    const firstFile = fileList[0]
    const isDirImport = firstFile.webkitRelativePath && firstFile.webkitRelativePath.includes('/')
    
    let name = 'untitled'
    const cache = new Map()

    if (isDirImport) {
      // 目录导入：从路径提取项目名
      const firstPath = firstFile.webkitRelativePath
      name = firstPath.split('/')[0] || 'untitled'

      // 构建文件树（传递项目名称以计算相对路径）
      const tree = buildTreeFromFileList(fileList, name)
      fileTree.value = tree

      // 读取所有文件内容
      for (const file of fileList) {
        try {
          const content = await file.text()
          const relativePath = file.webkitRelativePath.substring(name.length + 1)
          cache.set(relativePath, content)
        } catch {
          // 跳过无法读取的文件
        }
      }
    } else {
      // 文件导入：直接上传的文件，没有目录结构
      name = 'uploaded_files'
      
      // 构建简单的文件树（所有文件直接放在根目录）
      const tree = []
      for (const file of fileList) {
        tree.push({
          name: file.name,
          type: 'file',
          path: file.name,
          size: file.size,
        })
      }
      fileTree.value = tree

      // 读取所有文件内容
      for (const file of fileList) {
        try {
          const content = await file.text()
          cache.set(file.name, content)
        } catch {
          // 跳过无法读取的文件
        }
      }
    }

    projectName.value = name
    fileContentCache.value = cache
    loading.value = false
  }

  /** 设置文件树 */
  function setFileTree(tree) {
    fileTree.value = tree
  }

  /** 打开文件（优先使用缓存内容） */
  function openFile(filePath, content) {
    currentFilePath.value = filePath
    if (content !== undefined) {
      currentContent.value = content
    } else if (fileContentCache.value.has(filePath)) {
      currentContent.value = fileContentCache.value.get(filePath)
    }
  }

  /** 更新文件内容 */
  function updateContent(content) {
    currentContent.value = content
  }

  /** 关闭当前文件 */
  function closeFile() {
    currentFilePath.value = null
    currentContent.value = ''
  }

  /** 设置项目配置 */
  function setProjectConfig(config) {
    if (config.name !== undefined) projectName.value = config.name
    if (config.rootDir !== undefined) rootDir.value = config.rootDir
  }

  /** 重置项目状态 */
  function reset() {
    projectName.value = ''
    rootDir.value = ''
    fileTree.value = []
    currentFilePath.value = null
    currentContent.value = ''
    loading.value = false
    fileContentCache.value = new Map()
  }

  return {
    projectName, rootDir, fileTree, hasProject,
    currentFilePath, currentContent, currentFileName, hasFileOpen,
    loading, fileContentCache,
    initSubscriptions, cleanupSubscriptions,
    importFromFileList, buildTreeFromFileList,
    setFileTree, openFile, updateContent, closeFile, setProjectConfig, reset,
  }
})
