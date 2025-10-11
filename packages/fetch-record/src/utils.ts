import { RequestRecord, HttpMethod, MatchResult, ParamMatchRule } from './types';

/**
 * 生成请求的唯一 ID
 * 基于 path + 请求参数的 hash
 */
export function generateRequestId(path: string, params: any): string {
  const paramsStr = JSON.stringify(params || {});
  const hash = simpleHash(path + paramsStr);
  return `${path}_${hash}`;
}

/**
 * 简单的哈希函数
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 从 URL 提取路径（不包含域名和查询参数）
 */
export function extractPath(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname;
  } catch (error) {
    // 如果是相对路径，直接返回
    return url.split('?')[0];
  }
}

/**
 * 解析请求参数
 */
export function parseRequestParams(
  url: string,
  method: HttpMethod,
  body?: any
): any {
  const params: any = {};

  // 解析 URL 查询参数
  try {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (error) {
    // 忽略解析错误
  }

  // 对于 POST/PUT/PATCH，添加请求体
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        Object.assign(params, { body: parsed });
      } else if (body instanceof FormData) {
        const formData: any = {};
        body.forEach((value, key) => {
          formData[key] = value;
        });
        Object.assign(params, { body: formData });
      } else {
        Object.assign(params, { body });
      }
    } catch (error) {
      // 如果无法解析，直接存储原始 body
      Object.assign(params, { body });
    }
  }

  return params;
}

/**
 * 检查路径是否匹配（支持正则表达式）
 */
export function matchPath(pattern: string, path: string): boolean {
  try {
    // 尝试作为正则表达式匹配
    const regex = new RegExp(pattern);
    return regex.test(path);
  } catch (error) {
    // 如果不是有效的正则表达式，使用精确匹配
    return pattern === path;
  }
}

/**
 * 检查参数是否匹配
 */
export function matchParams(
  rule: ParamMatchRule | undefined,
  params: any
): boolean {
  if (!rule || Object.keys(rule).length === 0) {
    return true; // 没有规则，默认匹配
  }

  for (const [key, pattern] of Object.entries(rule)) {
    const value = params[key];
    
    if (value === undefined) {
      return false; // 必需的参数不存在
    }

    // 如果 pattern 是正则表达式
    if (pattern instanceof RegExp) {
      if (!pattern.test(String(value))) {
        return false;
      }
    } else if (typeof pattern === 'string') {
      try {
        // 尝试作为正则表达式
        const regex = new RegExp(pattern);
        if (!regex.test(String(value))) {
          return false;
        }
      } catch (error) {
        // 如果不是有效的正则，使用精确匹配
        if (String(value) !== pattern) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * 查找匹配的记录
 */
export function findMatchingRecord(
  records: RequestRecord[],
  path: string,
  params: any
): MatchResult {
  for (const record of records) {
    // 检查路径匹配
    if (!matchPath(record.path, path)) {
      continue;
    }

    // 检查参数匹配
    if (!matchParams(record.matchRule, params)) {
      continue;
    }

    return { matched: true, record };
  }

  return { matched: false };
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (obj instanceof Object) {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 下载 JSON 文件
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 读取 JSON 文件
 */
export function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

