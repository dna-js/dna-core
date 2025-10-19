/**
 * 函数参数定义
 */
export interface ParameterDefinition {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** 展示名称 */
  label?: string;
  /** 默认值 */
  default?: any;
  /** 帮助描述 */
  helper?: string;
  /** 子参数（用于对象类型） */
  properties?: ParameterDefinition[];
}

/**
 * 函数返回值定义
 */
export interface ReturnDefinition {
  /** 返回值类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'void';
  /** 展示名称 */
  label?: string;
  /** 帮助描述 */
  helper?: string;
  /** 子返回值（用于对象类型） */
  properties?: ParameterDefinition[];
}

/**
 * 函数定义
 */
export interface FunctionDefinition {
  /** 函数名 */
  name: string;
  /** 展示名称 */
  label?: string;
  /** 帮助描述 */
  helper?: string;
  /** 参数定义 */
  parameters: ParameterDefinition[];
  /** 返回值定义 */
  returns: ReturnDefinition;
  /** 函数体代码 */
  body: string;
}

/**
 * Fx执行选项
 */
export interface FxOptions {
  /** 是否在Web Worker中执行 */
  useWebWorker?: boolean;
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 允许的全局对象 */
  allowedGlobals?: string[];
  /** 禁止的全局对象 */
  forbiddenGlobals?: string[];
}

/**
 * Fx执行结果
 */
export interface FxResult<T = any> {
  /** 执行结果 */
  result: T;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 是否在Web Worker中执行 */
  executedInWorker: boolean;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * Web Worker消息类型
 */
export interface WorkerMessage {
  type: 'execute' | 'result' | 'error';
  id: string;
  data?: any;
  error?: string;
}
