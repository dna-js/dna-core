/**
 * 用于调试使用的页面模型数据存储读取（from indexedDB）
 */

/**
 * 持久化存储的数据结构
 * - 序列化之后的组件配置数据，也是com的入参
 */
type ComArgs<T = any> = {
  keyIdentifier?: string
  cmpType: string
  /**
   * 可选
   * - 某些组件上有 apiKey
   */
  apiKey?: string
  props?: T

  /**
   * 实例级别可编程配置
   * - 用于控制组件在设计态的行为， 仅用于定义布局，运行态基本不使用
   * - 某些值通过在设计态自动注入props来控制运行态， 比如 $var_space_enable 设置为true时会在props中产生 varSpaceEnabled
   * - 全部以$开头的_间隔
   * - 详见： https://wiki.ingageapp.com/pages/viewpage.action?pageId=143107939
   */
  define?: {
    /**
     * 启用别名（唯一标记）
     * - 启用后，组件的面板上会出现设置别名
     * - 布局中唯一
     */
    $alias_enabled?: boolean

    /**
     * 最大后代数量(暂未使用)
     * - 主要用于布局， 限制后代数量
     * - 系统默认值为10
     */
    $max_children_number?: number

    /**
     * 是否启用变量空间(暂未使用)
     * - 实现由组件自行实现，这里只是提供启用开头
     * - 当启用时，默认变量空间键值为define.alias，比如主表的alias为$mainProps
     */
    $var_space_enabled?: boolean
  }

  /**
   * 组件的布局区域
   * - 持有布局的组件，渲染时将由其布局接管渲染
   */
  regions?: {
    template: string
    [key: string]: any
  }
  subCmps?: ComArgs[]
}

/**
 * 布局记录类
 */
class XComLayout {
  /**
   * 页面引擎
   * - readonly
   */
  readonly pageEngine: string

  /**
   * 页面key
   * - readonly
   */
  readonly pageKey: string

  /**
   * 当前布局的apiKey
   * - readonly
   */
  readonly layoutApiKey: string

  /**
   * 布局信息
   */
  layoutInfo: {
    apiKey: string
    label: string
    id?: number
  }

  /**
   * layout布局信息
   */
  layout: ComArgs

  constructor(pageEngine: string, pageKey: string, layoutApiKey: string) {
    this.pageEngine = pageEngine
    this.pageKey = pageKey
    this.layoutApiKey = layoutApiKey
    this.layoutInfo = {
      apiKey: layoutApiKey,
      label: ''
    }
    this.layout = {
      cmpType: 'neoLayoutRoot',
      keyIdentifier: 'neoLayoutRoot.1',
      props: {},
      subCmps: []
    }
  }

  /**
   * 设置布局标签
   * @param label 布局标签
   */
  setLayoutLabel(label: string): void {
    this.layoutInfo.label = label
  }

  /**
   * 设置布局节点
   * @param layout ComArgs 数据结构
   */
  setLayout(layout: ComArgs): void {
    this.layout = layout
  }

  /**
   * 转换为普通对象（用于存储）
   */
  toJSON() {
    return {
      pageEngine: this.pageEngine,
      pageKey: this.pageKey,
      layoutApiKey: this.layoutApiKey,
      layoutInfo: this.layoutInfo,
      layout: this.layout
    }
  }

  /**
   * 从普通对象创建 XComLayout 实例
   */
  static fromJSON(data: any): XComLayout {
    const layout = new XComLayout(data.pageEngine, data.pageKey, data.layoutApiKey)
    layout.layoutInfo = data.layoutInfo
    layout.layout = data.layout
    return layout
  }
}

class __PageModelDB__ {
  private dbName = 'pageModelDB'
  private storeName = 'layouts'
  private version = 1
  private db: IDBDatabase | null = null

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    return localStorage.getItem('faker_page_model') === 'true'
  }

  /**
   * Enable debug mode
   */
  enable(): void {
    localStorage.setItem('faker_page_model', 'true')
    this.log('PageModelDB debug mode enabled')
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    localStorage.setItem('faker_page_model', 'false')
    this.log('PageModelDB debug mode disabled')
  }

  /**
   * Check if logging is enabled
   */
  isLogEnabled(): boolean {
    return localStorage.getItem('page_model_log_enabled') === 'true'
  }

  /**
   * Enable console logging
   */
  enableLog(): void {
    localStorage.setItem('page_model_log_enabled', 'true')
    console.log('PageModelDB logging enabled')
  }

  /**
   * Disable console logging
   */
  disableLog(): void {
    localStorage.setItem('page_model_log_enabled', 'false')
    console.log('PageModelDB logging disabled')
  }

  /**
   * Internal logging method - only logs when logging is enabled
   */
  private log(...args: any[]): void {
    if (this.isLogEnabled()) {
      console.log('[PageModelDB]', ...args)
    }
  }

  /**
   * Internal error logging method - always logs errors
   */
  private logError(...args: any[]): void {
    console.error('[PageModelDB]', ...args)
  }

  /**
   * Internal warning logging method - only logs when logging is enabled
   */
  private logWarn(...args: any[]): void {
    if (this.isLogEnabled()) {
      console.warn('[PageModelDB]', ...args)
    }
  }

  /**
   * 存储的布局数据
   * - key: pageEngine_pageKey
   * - value: XComLayout[]
   */
  layoutList: Map<string, XComLayout[]> = new Map()

  constructor() {
    this.initDB()
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        this.logError('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.log('IndexedDB opened successfully')
        this.loadFromIndexedDB().then(resolve).catch(reject)
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          })

          // Create indexes
          objectStore.createIndex('pageEngine', 'pageEngine', { unique: false })
          objectStore.createIndex('pageKey', 'pageKey', { unique: false })
          objectStore.createIndex('layoutApiKey', 'layoutApiKey', { unique: false })
          objectStore.createIndex('composite', ['pageEngine', 'pageKey', 'layoutApiKey'], {
            unique: true
          })

          this.log('IndexedDB object store created successfully')
        }
      }
    })
  }

  /**
   * Load data from IndexedDB to memory
   */
  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.getAll()

      request.onsuccess = () => {
        const records = request.result
        this.layoutList.clear()

        records.forEach((record) => {
          const layout = XComLayout.fromJSON(record)
          const key = this.getMapKey(layout.pageEngine, layout.pageKey)

          if (!this.layoutList.has(key)) {
            this.layoutList.set(key, [])
          }
          this.layoutList.get(key)!.push(layout)
        })

        this.log('Loaded data from IndexedDB successfully, total pages:', this.layoutList.size)
        resolve()
      }

      request.onerror = () => {
        this.logError('Failed to load data from IndexedDB:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Generate Map key
   */
  private getMapKey(pageEngine: string, pageKey: string): string {
    return `${pageEngine}_${pageKey}`
  }

  /**
   * Get layout
   * @param pageEngine Page engine
   * @param pageKey Page key
   * @param layoutApiKey Layout API key
   * @returns XComLayout instance or null
   */
  getLayout(pageEngine: string, pageKey: string, layoutApiKey: string): XComLayout | null {
    const key = this.getMapKey(pageEngine, pageKey)
    const layouts = this.layoutList.get(key)

    if (!layouts) {
      return null
    }

    return layouts.find((layout) => layout.layoutApiKey === layoutApiKey) || null
  }

  /**
   * Add or update layout
   * @param layout XComLayout instance
   */
  async addOrUpdateLayout(layout: XComLayout): Promise<void> {
    const key = this.getMapKey(layout.pageEngine, layout.pageKey)

    if (!this.layoutList.has(key)) {
      this.layoutList.set(key, [])
    }

    const layouts = this.layoutList.get(key)!
    const index = layouts.findIndex((l) => l.layoutApiKey === layout.layoutApiKey)

    if (index !== -1) {
      layouts[index] = layout
    } else {
      layouts.push(layout)
    }

    await this.save2IndexedDB(layout)
  }

  /**
   * Generate a layout instance
   * - Will not sync to IndexedDB or update layoutList
   * @param pageEngine Page engine
   * @param pageKey Page key
   * @param layoutApiKey Layout API key
   * @returns XComLayout instance
   */
  generateLayout(pageEngine: string, pageKey: string, layoutApiKey: string): XComLayout {
    return new XComLayout(pageEngine, pageKey, layoutApiKey)
  }

  /**
   * Save layout to IndexedDB
   * @param layout XComLayout instance
   */
  async save2IndexedDB(layout: XComLayout): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('composite')

      // Check if exists first
      const getRequest = index.getKey([layout.pageEngine, layout.pageKey, layout.layoutApiKey])

      getRequest.onsuccess = () => {
        const existingKey = getRequest.result

        if (existingKey) {
          // Update existing record
          const updateRequest = objectStore.put({
            ...layout.toJSON(),
            id: existingKey
          })

          updateRequest.onsuccess = () => {
            this.log('Layout updated successfully')
            resolve()
          }

          updateRequest.onerror = () => {
            this.logError('Failed to update layout:', updateRequest.error)
            reject(updateRequest.error)
          }
        } else {
          // Add new record
          const addRequest = objectStore.add(layout.toJSON())

          addRequest.onsuccess = () => {
            this.log('Layout added successfully')
            resolve()
          }

          addRequest.onerror = () => {
            this.logError('Failed to add layout:', addRequest.error)
            reject(addRequest.error)
          }
        }
      }

      getRequest.onerror = () => {
        this.logError('Failed to query layout:', getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * Delete specified layout
   * @param pageEngine Page engine
   * @param pageKey Page key
   * @param layoutApiKey Layout API key
   */
  async deleteLayout(pageEngine: string, pageKey: string, layoutApiKey: string): Promise<void> {
    // Delete from memory
    const key = this.getMapKey(pageEngine, pageKey)
    const layouts = this.layoutList.get(key)

    if (layouts) {
      const index = layouts.findIndex((l) => l.layoutApiKey === layoutApiKey)
      if (index !== -1) {
        layouts.splice(index, 1)

        // If no layouts left for this page, delete the key
        if (layouts.length === 0) {
          this.layoutList.delete(key)
        }
      }
    }

    // Delete from IndexedDB
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('composite')

      const getRequest = index.getKey([pageEngine, pageKey, layoutApiKey])

      getRequest.onsuccess = () => {
        const existingKey = getRequest.result

        if (existingKey) {
          const deleteRequest = objectStore.delete(existingKey)

          deleteRequest.onsuccess = () => {
            this.log('Layout deleted successfully')
            resolve()
          }

          deleteRequest.onerror = () => {
            this.logError('Failed to delete layout:', deleteRequest.error)
            reject(deleteRequest.error)
          }
        } else {
          this.logWarn('Layout not found for deletion')
          resolve()
        }
      }

      getRequest.onerror = () => {
        this.logError('Failed to query layout:', getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * Get all layouts
   */
  getAllLayouts(): Map<string, XComLayout[]> {
    return new Map(this.layoutList)
  }

  /**
   * Clear all layouts
   */
  async clearAllLayouts(): Promise<void> {
    this.layoutList.clear()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.clear()

      request.onsuccess = () => {
        this.log('All layouts cleared')
        resolve()
      }

      request.onerror = () => {
        this.logError('Failed to clear layouts:', request.error)
        reject(request.error)
      }
    })
  }
}

/**
 * Declare global window interface extension
 */
declare global {
  interface Window {
    $PageModelDB?: __PageModelDB__
  }
}

/**
 * Get or create global unique PageModelDB instance
 * - Ensures singleton instance across different applications
 * - Only enabled when localStorage faker_page_model is true
 */
function getGlobalPageModelDB(): __PageModelDB__ {
  if (typeof window !== 'undefined') {
    if (!window.$PageModelDB) {
      window.$PageModelDB = new __PageModelDB__()
      // Always log instance creation to console
      console.log('[PageModelDB] Global instance created')
    }
    return window.$PageModelDB
  }
  // Fallback for non-browser environments
  return new __PageModelDB__()
}

const pageModelDB = getGlobalPageModelDB()

export { pageModelDB, XComLayout }
