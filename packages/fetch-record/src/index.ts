import { FetchRecord } from './fetch-record';
import { FetchRecordAPI } from './types';

// 导出类型
export * from './types';
export { FetchRecord } from './fetch-record';
export { DBManager } from './db-manager';
export { ConfigManager } from './config';

/**
 * 创建全局 $FR 变量
 */
let globalInstance: FetchRecord | null = null;

/**
 * 初始化 FetchRecord
 */
export async function initFetchRecord(): Promise<FetchRecordAPI> {
  if (globalInstance) {
    return globalInstance;
  }

  globalInstance = new FetchRecord();
  await globalInstance.init();

  // 挂载到全局变量
  if (typeof window !== 'undefined') {
    (window as any).$FR = globalInstance;
    console.log('[FetchRecord] Global $FR available');
  }

  return globalInstance;
}

/**
 * 获取全局实例
 */
export function getFetchRecordInstance(): FetchRecord | null {
  return globalInstance;
}

/**
 * 自动初始化（如果在浏览器环境）
 */
if (typeof window !== 'undefined') {
  // 等待 DOM 加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFetchRecord().catch(error => {
        console.error('[FetchRecord] Auto-initialization failed:', error);
      });
    });
  } else {
    // DOM 已经加载完成，立即初始化
    initFetchRecord().catch(error => {
      console.error('[FetchRecord] Auto-initialization failed:', error);
    });
  }
}

// 默认导出
export default {
  initFetchRecord,
  getFetchRecordInstance,
  FetchRecord,
};

