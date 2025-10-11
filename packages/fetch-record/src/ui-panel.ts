import { RequestRecord, ExportData } from './types';
import { DBManager } from './db-manager';
import { ConfigManager } from './config';
import { formatTimestamp, downloadJSON, readJSONFile } from './utils';

/**
 * UI 面板类
 */
export class UIPanel {
  private dbManager: DBManager;
  private configManager: ConfigManager;
  private panelElement: HTMLElement | null = null;
  private isVisible = false;
  private records: RequestRecord[] = [];

  constructor(dbManager: DBManager, configManager: ConfigManager) {
    this.dbManager = dbManager;
    this.configManager = configManager;
  }

  /**
   * 显示面板
   */
  async show(): Promise<void> {
    if (this.isVisible) {
      return;
    }

    await this.loadRecords();
    this.createPanel();
    this.isVisible = true;
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.panelElement) {
      document.body.removeChild(this.panelElement);
      this.panelElement = null;
      this.isVisible = false;
    }
  }

  /**
   * 加载记录
   */
  private async loadRecords(): Promise<void> {
    try {
      this.records = await this.dbManager.getAllRecords();
      this.records.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[FetchRecord] Failed to load records:', error);
      this.records = [];
    }
  }

  /**
   * 创建面板
   */
  private createPanel(): void {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'fr-overlay';
    
    // 创建面板容器
    const panel = document.createElement('div');
    panel.className = 'fr-panel';
    
    // 添加样式
    this.injectStyles();
    
    // 创建头部
    const header = this.createHeader();
    panel.appendChild(header);
    
    // 创建工具栏
    const toolbar = this.createToolbar();
    panel.appendChild(toolbar);
    
    // 创建表格
    const table = this.createTable();
    panel.appendChild(table);
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.panelElement = overlay;

    // 点击遮罩层关闭面板
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });
  }

  /**
   * 创建头部
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'fr-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Fetch Record Panel';
    title.className = 'fr-title';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'fr-close-btn';
    closeBtn.onclick = () => this.hide();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }

  /**
   * 创建工具栏
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'fr-toolbar';
    
    // 配置开关区域
    const configSection = document.createElement('div');
    configSection.className = 'fr-config-section';
    
    // 记录开关
    const recordToggle = this.createToggle(
      '记录功能',
      this.configManager.isRecordEnabled(),
      (enabled) => {
        if (enabled) {
          this.configManager.enableRecord();
        } else {
          this.configManager.disableRecord();
        }
      }
    );
    
    // 回放开关
    const replayToggle = this.createToggle(
      '回放功能',
      this.configManager.isReplayEnabled(),
      (enabled) => {
        if (enabled) {
          this.configManager.enableReplay();
        } else {
          this.configManager.disableReplay();
        }
      }
    );
    
    configSection.appendChild(recordToggle);
    configSection.appendChild(replayToggle);
    
    // 操作按钮区域
    const actionSection = document.createElement('div');
    actionSection.className = 'fr-action-section';
    
    // 导出按钮
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '导出数据';
    exportBtn.className = 'fr-btn';
    exportBtn.onclick = () => this.exportData();
    
    // 导入按钮
    const importBtn = document.createElement('button');
    importBtn.textContent = '导入数据';
    importBtn.className = 'fr-btn';
    importBtn.onclick = () => this.importData();
    
    // 清空按钮
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空记录';
    clearBtn.className = 'fr-btn fr-btn-danger';
    clearBtn.onclick = () => this.clearRecords();
    
    // 刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新';
    refreshBtn.className = 'fr-btn';
    refreshBtn.onclick = () => this.refresh();
    
    actionSection.appendChild(exportBtn);
    actionSection.appendChild(importBtn);
    actionSection.appendChild(clearBtn);
    actionSection.appendChild(refreshBtn);
    
    toolbar.appendChild(configSection);
    toolbar.appendChild(actionSection);
    
    return toolbar;
  }

  /**
   * 创建开关组件
   */
  private createToggle(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const container = document.createElement('label');
    container.className = 'fr-toggle';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.onchange = () => onChange(checkbox.checked);
    
    const span = document.createElement('span');
    span.textContent = label;
    
    container.appendChild(checkbox);
    container.appendChild(span);
    
    return container;
  }

  /**
   * 创建表格
   */
  private createTable(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'fr-table-container';
    
    const table = document.createElement('table');
    table.className = 'fr-table';
    
    // 表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['路径', '方法', '参数', '响应', '时间', '操作'];
    headers.forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    
    if (this.records.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = headers.length;
      emptyCell.textContent = '暂无记录';
      emptyCell.className = 'fr-empty';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      this.records.forEach(record => {
        const row = this.createTableRow(record);
        tbody.appendChild(row);
      });
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    return container;
  }

  /**
   * 创建表格行
   */
  private createTableRow(record: RequestRecord): HTMLElement {
    const row = document.createElement('tr');
    
    // 路径
    const pathCell = document.createElement('td');
    pathCell.textContent = record.path;
    pathCell.className = 'fr-cell-path';
    pathCell.title = record.path;
    row.appendChild(pathCell);
    
    // 方法
    const methodCell = document.createElement('td');
    methodCell.textContent = record.method;
    methodCell.className = `fr-cell-method fr-method-${record.method.toLowerCase()}`;
    row.appendChild(methodCell);
    
    // 参数
    const paramsCell = document.createElement('td');
    const paramsBtn = document.createElement('button');
    paramsBtn.textContent = '查看参数';
    paramsBtn.className = 'fr-btn-small';
    paramsBtn.onclick = () => this.showJSON('请求参数', record.params, record);
    paramsCell.appendChild(paramsBtn);
    row.appendChild(paramsCell);
    
    // 响应
    const responseCell = document.createElement('td');
    const responseBtn = document.createElement('button');
    responseBtn.textContent = '查看响应';
    responseBtn.className = 'fr-btn-small';
    responseBtn.onclick = () => this.showJSON('响应数据', record.response);
    responseCell.appendChild(responseBtn);
    row.appendChild(responseCell);
    
    // 时间
    const timeCell = document.createElement('td');
    timeCell.textContent = formatTimestamp(record.timestamp);
    timeCell.className = 'fr-cell-time';
    row.appendChild(timeCell);
    
    // 操作
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.className = 'fr-btn-small fr-btn-danger';
    deleteBtn.onclick = () => this.deleteRecord(record.id);
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);
    
    return row;
  }

  /**
   * 显示 JSON 数据
   */
  private showJSON(title: string, data: any, record?: RequestRecord): void {
    const modal = document.createElement('div');
    modal.className = 'fr-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'fr-modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'fr-modal-header';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'fr-close-btn';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'fr-modal-body';
    
    const pre = document.createElement('pre');
    pre.className = 'fr-json';
    pre.textContent = JSON.stringify(data, null, 2);
    
    modalBody.appendChild(pre);
    
    // 如果是参数，添加编辑功能
    if (record) {
      const editBtn = document.createElement('button');
      editBtn.textContent = '编辑匹配规则';
      editBtn.className = 'fr-btn';
      editBtn.onclick = () => this.editMatchRule(record, modal);
      modalBody.appendChild(editBtn);
    }
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * 编辑匹配规则
   */
  private editMatchRule(record: RequestRecord, parentModal: HTMLElement): void {
    const modal = document.createElement('div');
    modal.className = 'fr-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'fr-modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'fr-modal-header';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = '编辑匹配规则';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'fr-close-btn';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'fr-modal-body';
    
    const description = document.createElement('p');
    description.textContent = '为参数键设置正则表达式匹配规则：';
    modalBody.appendChild(description);
    
    // 路径编辑
    const pathGroup = document.createElement('div');
    pathGroup.className = 'fr-form-group';
    const pathLabel = document.createElement('label');
    pathLabel.textContent = '路径（支持正则）:';
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.value = record.path;
    pathInput.className = 'fr-input';
    pathGroup.appendChild(pathLabel);
    pathGroup.appendChild(pathInput);
    modalBody.appendChild(pathGroup);
    
    // 参数匹配规则编辑
    const ruleTextarea = document.createElement('textarea');
    ruleTextarea.className = 'fr-textarea';
    ruleTextarea.rows = 10;
    ruleTextarea.value = JSON.stringify(record.matchRule || {}, null, 2);
    modalBody.appendChild(ruleTextarea);
    
    const hint = document.createElement('p');
    hint.className = 'fr-hint';
    hint.textContent = '提示：matchRule 是一个对象，键为参数名，值为正则表达式字符串';
    modalBody.appendChild(hint);
    
    // 保存按钮
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'fr-btn';
    saveBtn.onclick = async () => {
      try {
        const matchRule = JSON.parse(ruleTextarea.value);
        record.path = pathInput.value;
        record.matchRule = matchRule;
        await this.dbManager.updateRecord(record);
        alert('保存成功');
        document.body.removeChild(modal);
        document.body.removeChild(parentModal);
        this.refresh();
      } catch (error) {
        alert('保存失败：' + error);
      }
    };
    modalBody.appendChild(saveBtn);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * 删除记录
   */
  private async deleteRecord(id: string): Promise<void> {
    if (!confirm('确定要删除此记录吗？')) {
      return;
    }
    
    try {
      await this.dbManager.deleteRecord(id);
      this.refresh();
    } catch (error) {
      alert('删除失败：' + error);
    }
  }

  /**
   * 导出数据
   */
  private async exportData(): Promise<void> {
    try {
      const data = await this.dbManager.exportData();
      const filename = `fetch-record-${Date.now()}.json`;
      downloadJSON(data, filename);
    } catch (error) {
      alert('导出失败：' + error);
    }
  }

  /**
   * 导入数据
   */
  private importData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const data: ExportData = await readJSONFile(file);
        await this.dbManager.importData(data);
        alert('导入成功');
        this.refresh();
      } catch (error) {
        alert('导入失败：' + error);
      }
    };
    input.click();
  }

  /**
   * 清空记录
   */
  private async clearRecords(): Promise<void> {
    if (!confirm('确定要清空所有记录吗？此操作不可恢复！')) {
      return;
    }
    
    try {
      await this.dbManager.clearAllRecords();
      this.refresh();
    } catch (error) {
      alert('清空失败：' + error);
    }
  }

  /**
   * 刷新面板
   */
  private async refresh(): Promise<void> {
    await this.loadRecords();
    
    if (this.panelElement) {
      const oldPanel = this.panelElement;
      this.panelElement = null;
      this.createPanel();
      if (oldPanel.parentNode) {
        oldPanel.parentNode.replaceChild(this.panelElement, oldPanel);
      }
    }
  }

  /**
   * 注入样式
   */
  private injectStyles(): void {
    if (document.getElementById('fr-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'fr-styles';
    style.textContent = `
      .fr-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
      }
      
      .fr-panel {
        background: #fff;
        border-radius: 8px;
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .fr-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .fr-title {
        margin: 0;
        font-size: 20px;
        color: #333;
      }
      
      .fr-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .fr-close-btn:hover {
        background: #f0f0f0;
        color: #333;
      }
      
      .fr-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        border-bottom: 1px solid #e0e0e0;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .fr-config-section {
        display: flex;
        gap: 16px;
      }
      
      .fr-action-section {
        display: flex;
        gap: 8px;
      }
      
      .fr-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }
      
      .fr-toggle input[type="checkbox"] {
        cursor: pointer;
      }
      
      .fr-btn {
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .fr-btn:hover {
        background: #f5f5f5;
        border-color: #999;
      }
      
      .fr-btn-danger {
        color: #d32f2f;
        border-color: #d32f2f;
      }
      
      .fr-btn-danger:hover {
        background: #ffebee;
      }
      
      .fr-btn-small {
        padding: 4px 12px;
        font-size: 12px;
        border: 1px solid #ddd;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .fr-btn-small:hover {
        background: #f5f5f5;
        border-color: #999;
      }
      
      .fr-table-container {
        flex: 1;
        overflow: auto;
        padding: 0 24px 24px;
      }
      
      .fr-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      
      .fr-table th {
        position: sticky;
        top: 0;
        background: #f5f5f5;
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid #ddd;
      }
      
      .fr-table td {
        padding: 12px 8px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .fr-table tr:hover {
        background: #f9f9f9;
      }
      
      .fr-cell-path {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .fr-cell-method {
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .fr-method-get { color: #2196F3; }
      .fr-method-post { color: #4CAF50; }
      .fr-method-put { color: #FF9800; }
      .fr-method-delete { color: #F44336; }
      .fr-method-patch { color: #9C27B0; }
      
      .fr-cell-time {
        font-size: 12px;
        color: #666;
      }
      
      .fr-empty {
        text-align: center;
        padding: 40px;
        color: #999;
      }
      
      .fr-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
      }
      
      .fr-modal-content {
        background: #fff;
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .fr-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .fr-modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }
      
      .fr-modal-body {
        flex: 1;
        overflow: auto;
        padding: 24px;
      }
      
      .fr-json {
        background: #f5f5f5;
        padding: 16px;
        border-radius: 4px;
        overflow: auto;
        max-height: 400px;
        font-size: 12px;
        line-height: 1.5;
        margin: 0 0 16px 0;
      }
      
      .fr-form-group {
        margin-bottom: 16px;
      }
      
      .fr-form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }
      
      .fr-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .fr-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
        box-sizing: border-box;
        resize: vertical;
      }
      
      .fr-hint {
        font-size: 12px;
        color: #666;
        margin: 8px 0;
      }
    `;
    
    document.head.appendChild(style);
  }
}

