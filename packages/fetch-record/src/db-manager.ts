import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RequestRecord, ExportData, IDBManager } from './types';

/**
 * IndexDB 数据库架构
 */
interface FetchRecordDB extends DBSchema {
  records: {
    key: string;
    value: RequestRecord;
    indexes: { 'by-path': string; 'by-timestamp': number };
  };
}

/**
 * IndexDB 管理类
 */
export class DBManager implements IDBManager {
  private db: IDBPDatabase<FetchRecordDB> | null = null;
  private dbName: string;
  private storeName: string = 'records';
  private version: number = 1;

  constructor(dbName: string = 'FetchRecordDB') {
    this.dbName = dbName;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = await openDB<FetchRecordDB>(this.dbName, this.version, {
      upgrade(db) {
        // 创建对象存储
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: 'id' });
          store.createIndex('by-path', 'path');
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  /**
   * 确保数据库已初始化
   */
  private ensureDB(): IDBPDatabase<FetchRecordDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * 添加请求记录
   */
  async addRecord(record: RequestRecord): Promise<void> {
    const db = this.ensureDB();
    await db.add(this.storeName, record);
  }

  /**
   * 获取单条记录
   */
  async getRecord(id: string): Promise<RequestRecord | undefined> {
    const db = this.ensureDB();
    return await db.get(this.storeName, id);
  }

  /**
   * 获取所有记录
   */
  async getAllRecords(): Promise<RequestRecord[]> {
    const db = this.ensureDB();
    return await db.getAll(this.storeName);
  }

  /**
   * 根据路径获取记录
   */
  async getRecordsByPath(path: string): Promise<RequestRecord[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex(this.storeName, 'by-path', path);
  }

  /**
   * 更新记录
   */
  async updateRecord(record: RequestRecord): Promise<void> {
    const db = this.ensureDB();
    await db.put(this.storeName, record);
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete(this.storeName, id);
  }

  /**
   * 清空所有记录
   */
  async clearAllRecords(): Promise<void> {
    const db = this.ensureDB();
    await db.clear(this.storeName);
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<ExportData> {
    const records = await this.getAllRecords();
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      records,
    };
  }

  /**
   * 导入数据
   */
  async importData(data: ExportData): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    
    for (const record of data.records) {
      await tx.store.put(record);
    }
    
    await tx.done;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

