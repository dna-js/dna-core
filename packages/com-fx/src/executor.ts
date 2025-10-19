import { FxOptions, WorkerMessage } from './types';

/**
 * 执行器接口
 */
interface Executor {
  execute(code: string, args: any[], paramNames?: string[]): Promise<any>;
}

/**
 * 普通执行器
 */
export class NormalExecutor implements Executor {
  private options: Required<FxOptions>;

  constructor(options: Required<FxOptions>) {
    this.options = options;
  }

  async execute(code: string, args: any[], paramNames: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      try {
        // 创建安全的执行环境
        const safeContext = this.createSafeContext(args, paramNames);
        console.log('Safe context:', safeContext);
        console.log('Param names:', paramNames);

        // 执行代码
        const result = this.executeInSandbox(code, safeContext, paramNames);

        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * 创建安全上下文
   */
  private createSafeContext(args: any[], paramNames: string[]) {
    const context: any = {};

    // 添加参数到上下文
    args.forEach((arg, index) => {
      const paramName = paramNames[index] || `arg${index}`;
      context[paramName] = arg;
    });

    // 添加安全的全局对象
    const allowedGlobals = this.options.allowedGlobals || [];
    allowedGlobals.forEach(globalName => {
      if (typeof (globalThis as any)[globalName] !== 'undefined') {
        context[globalName] = (globalThis as any)[globalName];
      }
    });

    return context;
  }

  /**
   * 在沙箱中执行代码
   */
  private executeInSandbox(code: string, context: any, paramNames: string[]): any {
    // 创建安全的执行函数，避免使用with语句
    const paramValues = Object.values(context);

    // 将用户代码包装成一个完整的函数体
    const wrappedCode = `
      "use strict";
      ${code}
    `;

    const fn = new Function(...paramNames, wrappedCode);

    // 执行函数并返回结果
    const result = fn.apply(null, paramValues);
    console.log('Sandbox result:', result);
    return result;
  }
}

/**
 * Web Worker执行器
 */
export class WorkerExecutor implements Executor {
  private options: Required<FxOptions>;
  private worker: Worker | null = null;

  constructor(options: Required<FxOptions>) {
    this.options = options;
  }

  async execute(code: string, args: any[], paramNames: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.worker = this.createWorker();
      }

      const id = Math.random().toString(36).substr(2, 9);
      const message: WorkerMessage = {
        type: 'execute',
        id,
        data: { code, args, paramNames, options: this.options }
      };

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error(`Worker execution timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      // 监听消息
      const messageHandler = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.id === id) {
          this.worker!.removeEventListener('message', messageHandler);
          clearTimeout(timeout);

          if (event.data.type === 'result') {
            resolve(event.data.data);
          } else if (event.data.type === 'error') {
            reject(new Error(event.data.error));
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage(message);
    });
  }

  /**
   * 创建Worker
   */
  private createWorker(): Worker {
    const workerCode = `
      self.onmessage = function(event) {
        const { type, id, data } = event.data;

        if (type === 'execute') {
          try {
            const { code, args, paramNames = [], options } = data;

            // 使用提供的参数名，如果没有则使用默认的arg0, arg1等
            const argNames = paramNames.length > 0
              ? paramNames
              : args.map((_, index) => 'arg' + index);

            // 在Worker中执行代码
            const fn = new Function(...argNames, code);
            const result = fn(...args);

            self.postMessage({ type: 'result', id, data: result });
          } catch (error) {
            self.postMessage({ type: 'error', id, error: error.message });
          }
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
}

/**
 * 创建普通执行器
 */
export function createNormalExecutor(options: Required<FxOptions>): Executor {
  return new NormalExecutor(options);
}

/**
 * 创建Web Worker执行器
 */
export function createWorkerExecutor(options: Required<FxOptions>): Executor {
  return new WorkerExecutor(options);
}
