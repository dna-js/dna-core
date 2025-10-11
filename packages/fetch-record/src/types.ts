/**
 * 请求方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 请求参数匹配规则
 */
export interface ParamMatchRule {
  [key: string]: string | RegExp; // 支持正则表达式匹配
}

/**
 * 请求记录
 */
export interface RequestRecord {
  id: string; // 唯一标识符
  path: string; // 请求路径（可编辑，支持正则）
  method: HttpMethod; // 请求方法
  params: any; // 请求参数（可编辑，key支持正则）
  response: any; // 响应数据
  headers?: Record<string, string>; // 请求头
  timestamp: number; // 记录时间
  matchRule?: ParamMatchRule; // 参数匹配规则
}

/**
 * 配置选项
 */
export interface FetchRecordConfig {
  enableRecord: boolean; // 是否启用记录
  enableReplay: boolean; // 是否启用回放（优先从 IndexDB 获取）
  dbName: string; // IndexDB 数据库名
  storeName: string; // IndexDB 存储名
}

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string;
  timestamp: number;
  records: RequestRecord[];
}

/**
 * IndexDB 管理接口
 */
export interface IDBManager {
  init(): Promise<void>;
  addRecord(record: RequestRecord): Promise<void>;
  getRecord(id: string): Promise<RequestRecord | undefined>;
  getAllRecords(): Promise<RequestRecord[]>;
  updateRecord(record: RequestRecord): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  clearAllRecords(): Promise<void>;
  exportData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
}

/**
 * 请求匹配结果
 */
export interface MatchResult {
  matched: boolean;
  record?: RequestRecord;
}

/**
 * $FR 全局变量接口
 */
export interface FetchRecordAPI {
  showPanel(): void;
  hidePanel(): void;
  getConfig(): FetchRecordConfig;
  updateConfig(config: Partial<FetchRecordConfig>): void;
  exportData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
  clearRecords(): Promise<void>;
  enable(): void;
  disable(): void;
}

