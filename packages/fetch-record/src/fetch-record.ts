import { FetchRecordAPI, FetchRecordConfig, ExportData } from './types';
import { DBManager } from './db-manager';
import { ConfigManager } from './config';
import { RequestInterceptor } from './interceptor';
import { UIPanel } from './ui-panel';

/**
 * FetchRecord 主类
 */
export class FetchRecord implements FetchRecordAPI {
  private dbManager: DBManager;
  private configManager: ConfigManager;
  private interceptor: RequestInterceptor;
  private uiPanel: UIPanel;
  private initialized = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.dbManager = new DBManager(this.configManager.getConfig().dbName);
    this.interceptor = new RequestInterceptor(this.dbManager, this.configManager);
    this.uiPanel = new UIPanel(this.dbManager, this.configManager);
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.dbManager.init();
      this.interceptor.install();
      this.initialized = true;
      console.log('[FetchRecord] Initialized successfully');
    } catch (error) {
      console.error('[FetchRecord] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 显示面板
   */
  showPanel(): void {
    this.uiPanel.show();
  }

  /**
   * 隐藏面板
   */
  hidePanel(): void {
    this.uiPanel.hide();
  }

  /**
   * 获取配置
   */
  getConfig(): FetchRecordConfig {
    return this.configManager.getConfig();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FetchRecordConfig>): void {
    this.configManager.updateConfig(config);
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<ExportData> {
    return await this.dbManager.exportData();
  }

  /**
   * 导入数据
   */
  async importData(data: ExportData): Promise<void> {
    await this.dbManager.importData(data);
  }

  /**
   * 清空记录
   */
  async clearRecords(): Promise<void> {
    await this.dbManager.clearAllRecords();
  }

  /**
   * 启用（启用记录和回放）
   */
  enable(): void {
    this.configManager.enableRecord();
    console.log('[FetchRecord] Enabled');
  }

  /**
   * 禁用（禁用记录和回放）
   */
  disable(): void {
    this.configManager.disableRecord();
    this.configManager.disableReplay();
    console.log('[FetchRecord] Disabled');
  }

  /**
   * 启用记录
   */
  enableRecord(): void {
    this.configManager.enableRecord();
    console.log('[FetchRecord] Recording enabled');
  }

  /**
   * 禁用记录
   */
  disableRecord(): void {
    this.configManager.disableRecord();
    console.log('[FetchRecord] Recording disabled');
  }

  /**
   * 启用回放
   */
  enableReplay(): void {
    this.configManager.enableReplay();
    console.log('[FetchRecord] Replay enabled');
  }

  /**
   * 禁用回放
   */
  disableReplay(): void {
    this.configManager.disableReplay();
    console.log('[FetchRecord] Replay disabled');
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.interceptor.uninstall();
    this.uiPanel.hide();
    this.dbManager.close();
    this.initialized = false;
    console.log('[FetchRecord] Destroyed');
  }
}

