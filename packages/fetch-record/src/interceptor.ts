import { HttpMethod, RequestRecord } from './types';
import { DBManager } from './db-manager';
import { ConfigManager } from './config';
import {
  generateRequestId,
  extractPath,
  parseRequestParams,
  findMatchingRecord,
  deepClone,
} from './utils';

/**
 * 请求拦截器
 */
export class RequestInterceptor {
  private dbManager: DBManager;
  private configManager: ConfigManager;
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private isInstalled = false;

  constructor(dbManager: DBManager, configManager: ConfigManager) {
    this.dbManager = dbManager;
    this.configManager = configManager;
    this.originalFetch = window.fetch.bind(window);
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  /**
   * 安装拦截器
   */
  install(): void {
    if (this.isInstalled) {
      console.warn('[FetchRecord] Interceptor already installed');
      return;
    }

    this.interceptFetch();
    this.interceptXHR();
    this.isInstalled = true;
    console.log('[FetchRecord] Interceptor installed');
  }

  /**
   * 卸载拦截器
   */
  uninstall(): void {
    if (!this.isInstalled) {
      return;
    }

    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
    this.isInstalled = false;
    console.log('[FetchRecord] Interceptor uninstalled');
  }

  /**
   * 拦截 fetch 请求
   */
  private interceptFetch(): void {
    const self = this;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || 'GET').toUpperCase() as HttpMethod;
      const path = extractPath(url);
      const params = parseRequestParams(url, method, init?.body);

      // 如果启用回放，尝试从 IndexDB 获取数据
      if (self.configManager.isReplayEnabled()) {
        try {
          const allRecords = await self.dbManager.getAllRecords();
          const matchResult = findMatchingRecord(allRecords, path, params);

          if (matchResult.matched && matchResult.record) {
            console.log('[FetchRecord] Replay from IndexDB:', path);
            return self.createMockResponse(matchResult.record.response);
          }
        } catch (error) {
          console.warn('[FetchRecord] Failed to replay from IndexDB:', error);
        }
      }

      // 发起真实请求
      try {
        const response = await self.originalFetch(input, init);
        const clonedResponse = response.clone();

        // 如果启用记录，保存请求数据
        if (self.configManager.isRecordEnabled()) {
          self.recordFetchRequest(url, method, params, clonedResponse, init?.headers);
        }

        return response;
      } catch (error) {
        console.error('[FetchRecord] Fetch error:', error);
        throw error;
      }
    };
  }

  /**
   * 拦截 XMLHttpRequest
   */
  private interceptXHR(): void {
    const self = this;

    // 用于存储每个 XHR 实例的请求信息
    const xhrDataMap = new WeakMap<
      XMLHttpRequest,
      { method: HttpMethod; url: string; body: any }
    >();

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      const urlStr = typeof url === 'string' ? url : url.href;
      xhrDataMap.set(this, {
        method: method.toUpperCase() as HttpMethod,
        url: urlStr,
        body: null,
      });

      return self.originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
      const xhrData = xhrDataMap.get(this);

      if (xhrData) {
        xhrData.body = body;
        const { method, url } = xhrData;
        const path = extractPath(url);
        const params = parseRequestParams(url, method, body);

        // 如果启用回放，尝试从 IndexDB 获取数据
        if (self.configManager.isReplayEnabled()) {
          self.dbManager
            .getAllRecords()
            .then((allRecords) => {
              const matchResult = findMatchingRecord(allRecords, path, params);

              if (matchResult.matched && matchResult.record) {
                console.log('[FetchRecord] Replay from IndexDB (XHR):', path);
                self.mockXHRResponse(this, matchResult.record.response);
                return true;
              }
              return false;
            })
            .then((replayed) => {
              if (replayed) return;

              // 如果没有回放，继续真实请求
              self.setupXHRRecording(this, url, method, params);
              self.originalXHRSend.call(this, body);
            })
            .catch((error) => {
              console.warn('[FetchRecord] Failed to replay from IndexDB (XHR):', error);
              self.setupXHRRecording(this, url, method, params);
              self.originalXHRSend.call(this, body);
            });
        } else {
          // 不启用回放，直接发起请求
          self.setupXHRRecording(this, url, method, params);
          self.originalXHRSend.call(this, body);
        }
      } else {
        self.originalXHRSend.call(this, body);
      }
    };
  }

  /**
   * 设置 XHR 请求记录
   */
  private setupXHRRecording(
    xhr: XMLHttpRequest,
    url: string,
    method: HttpMethod,
    params: any
  ): void {
    if (!this.configManager.isRecordEnabled()) {
      return;
    }

    const self = this;
    const originalOnLoad = xhr.onload;
    const originalOnReadyStateChange = xhr.onreadystatechange;

    xhr.onreadystatechange = function (this: XMLHttpRequest, ev: Event) {
      if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
        self.recordXHRRequest(url, method, params, this);
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.call(this, ev);
      }
    };

    xhr.onload = function (this: XMLHttpRequest, ev: ProgressEvent) {
      if (this.status >= 200 && this.status < 300) {
        self.recordXHRRequest(url, method, params, this);
      }

      if (originalOnLoad) {
        originalOnLoad.call(this, ev);
      }
    };
  }

  /**
   * 记录 fetch 请求
   */
  private async recordFetchRequest(
    url: string,
    method: HttpMethod,
    params: any,
    response: Response,
    headers?: HeadersInit
  ): Promise<void> {
    try {
      const path = extractPath(url);
      const responseData = await this.parseResponse(response);
      const id = generateRequestId(path, params);

      const record: RequestRecord = {
        id,
        path,
        method,
        params: deepClone(params),
        response: responseData,
        headers: this.parseHeaders(headers),
        timestamp: Date.now(),
      };

      await this.dbManager.addRecord(record);
      console.log('[FetchRecord] Recorded fetch request:', path);
    } catch (error) {
      console.error('[FetchRecord] Failed to record fetch request:', error);
    }
  }

  /**
   * 记录 XHR 请求
   */
  private async recordXHRRequest(
    url: string,
    method: HttpMethod,
    params: any,
    xhr: XMLHttpRequest
  ): Promise<void> {
    try {
      const path = extractPath(url);
      const responseData = this.parseXHRResponse(xhr);
      const id = generateRequestId(path, params);

      const record: RequestRecord = {
        id,
        path,
        method,
        params: deepClone(params),
        response: responseData,
        timestamp: Date.now(),
      };

      await this.dbManager.addRecord(record);
      console.log('[FetchRecord] Recorded XHR request:', path);
    } catch (error) {
      console.error('[FetchRecord] Failed to record XHR request:', error);
    }
  }

  /**
   * 解析响应数据
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/')) {
      return await response.text();
    } else {
      return await response.text();
    }
  }

  /**
   * 解析 XHR 响应
   */
  private parseXHRResponse(xhr: XMLHttpRequest): any {
    const contentType = xhr.getResponseHeader('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return JSON.parse(xhr.responseText);
      } catch (error) {
        return xhr.responseText;
      }
    }

    return xhr.responseText;
  }

  /**
   * 解析请求头
   */
  private parseHeaders(headers?: HeadersInit): Record<string, string> | undefined {
    if (!headers) return undefined;

    const result: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else {
      Object.assign(result, headers);
    }

    return result;
  }

  /**
   * 创建模拟响应
   */
  private createMockResponse(data: any): Response {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    return new Response(body, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 模拟 XHR 响应
   */
  private mockXHRResponse(xhr: XMLHttpRequest, data: any): void {
    // 创建一个新的 XHR 对象用于模拟
    Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
    Object.defineProperty(xhr, 'status', { writable: true, value: 200 });
    Object.defineProperty(xhr, 'statusText', { writable: true, value: 'OK' });
    Object.defineProperty(xhr, 'responseText', {
      writable: true,
      value: typeof data === 'string' ? data : JSON.stringify(data),
    });
    Object.defineProperty(xhr, 'response', {
      writable: true,
      value: data,
    });

    // 触发事件
    setTimeout(() => {
      if (xhr.onreadystatechange) {
        xhr.onreadystatechange.call(xhr, new Event('readystatechange'));
      }
      if (xhr.onload) {
        xhr.onload.call(xhr, new ProgressEvent('load'));
      }
    }, 0);
  }
}

