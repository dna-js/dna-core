import { FetchRecordConfig } from './types';

const CONFIG_KEY = 'fetch-record-config';
const ENABLE_RECORD_KEY = 'fetch-record-enable-record';
const ENABLE_REPLAY_KEY = 'fetch-record-enable-replay';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: FetchRecordConfig = {
  enableRecord: true,
  enableReplay: false,
  dbName: 'FetchRecordDB',
  storeName: 'records',
};

/**
 * 配置管理类
 */
export class ConfigManager {
  private config: FetchRecordConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 从 localStorage 加载配置
   */
  private loadConfig(): FetchRecordConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('[FetchRecord] Failed to load config from localStorage:', error);
    }

    // 兼容旧的独立开关配置
    const enableRecord = localStorage.getItem(ENABLE_RECORD_KEY);
    const enableReplay = localStorage.getItem(ENABLE_REPLAY_KEY);

    return {
      ...DEFAULT_CONFIG,
      enableRecord: enableRecord !== null ? enableRecord === 'true' : DEFAULT_CONFIG.enableRecord,
      enableReplay: enableReplay !== null ? enableReplay === 'true' : DEFAULT_CONFIG.enableReplay,
    };
  }

  /**
   * 保存配置到 localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
      // 同时保存独立开关，方便快速访问
      localStorage.setItem(ENABLE_RECORD_KEY, String(this.config.enableRecord));
      localStorage.setItem(ENABLE_REPLAY_KEY, String(this.config.enableReplay));
    } catch (error) {
      console.warn('[FetchRecord] Failed to save config to localStorage:', error);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): FetchRecordConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<FetchRecordConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * 重置配置
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * 检查是否启用记录
   */
  isRecordEnabled(): boolean {
    return this.config.enableRecord;
  }

  /**
   * 检查是否启用回放
   */
  isReplayEnabled(): boolean {
    return this.config.enableReplay;
  }

  /**
   * 启用记录
   */
  enableRecord(): void {
    this.updateConfig({ enableRecord: true });
  }

  /**
   * 禁用记录
   */
  disableRecord(): void {
    this.updateConfig({ enableRecord: false });
  }

  /**
   * 启用回放
   */
  enableReplay(): void {
    this.updateConfig({ enableReplay: true });
  }

  /**
   * 禁用回放
   */
  disableReplay(): void {
    this.updateConfig({ enableReplay: false });
  }
}

