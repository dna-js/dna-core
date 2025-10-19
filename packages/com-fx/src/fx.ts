import { FunctionDefinition, FxOptions, FxResult, WorkerMessage } from './types';
import { createWorkerExecutor, createNormalExecutor } from './executor';

/**
 * Fx主类：将JSON定义转换为可执行函数
 */
export class Fx {
  private options: Required<FxOptions>;

  constructor(options: FxOptions = {}) {
    this.options = {
      useWebWorker: false,
      timeout: 5000,
      allowedGlobals: [],
      forbiddenGlobals: ['eval', 'Function', 'setTimeout', 'setInterval'],
      ...options
    };
  }

  /**
   * 创建可执行函数
   */
  createFunction(definition: FunctionDefinition): (...args: any[]) => Promise<FxResult> {
    const executor = this.options.useWebWorker
      ? createWorkerExecutor(this.options)
      : createNormalExecutor(this.options);

    return async (...args: any[]): Promise<FxResult> => {
      const startTime = Date.now();

      try {
        // 验证参数
        this.validateArguments(definition.parameters, args);

        // 创建函数代码
        const functionCode = this.buildFunctionCode(definition);

        // 执行函数
        const codeResult = await executor.execute(functionCode, args, definition.parameters.map(p => p.name));

        const executionTime = Date.now() - startTime;

        return {
          result: codeResult,
          executionTime,
          executedInWorker: this.options.useWebWorker,
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;

        return {
          result: undefined,
          executionTime,
          executedInWorker: this.options.useWebWorker,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };
  }

  /**
   * 验证参数
   */
  private validateArguments(parameters: any[], args: any[]): void {
    if (parameters.length !== args.length) {
      throw new Error(`Expected ${parameters.length} arguments, got ${args.length}`);
    }

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      const arg = args[i];

      if (arg === undefined && param.default === undefined) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      // 这里可以添加更复杂的类型验证
      this.validateParameterType(param, arg);
    }
  }

  /**
   * 验证参数类型
   */
  private validateParameterType(param: any, value: any): void {
    if (value === undefined || value === null) return;

    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Parameter ${param.name} expects string, got ${typeof value}`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Parameter ${param.name} expects number, got ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Parameter ${param.name} expects boolean, got ${typeof value}`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Parameter ${param.name} expects object, got ${typeof value}`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Parameter ${param.name} expects array, got ${typeof value}`);
        }
        break;
    }
  }

  /**
   * 构建函数代码
   */
  private buildFunctionCode(definition: FunctionDefinition): string {
    const paramNames = definition.parameters.map(p => p.name);

    return `
      (function(${paramNames.join(', ')}) {
        ${definition.body}
      })
    `;
  }

  /**
   * 设置选项
   */
  setOptions(options: Partial<FxOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取当前选项
   */
  getOptions(): Required<FxOptions> {
    return { ...this.options };
  }
}

/**
 * 创建Fx实例的便捷函数
 */
export function createFx(options?: FxOptions): Fx {
  return new Fx(options);
}
