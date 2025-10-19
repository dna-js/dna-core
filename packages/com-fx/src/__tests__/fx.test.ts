import { createFx, FunctionDefinition } from '../index';

describe('Fx', () => {
  describe('基本功能', () => {
    it('应该能够创建简单的数学函数', async () => {
      const fx = createFx();

      const functionDefinition: FunctionDefinition = {
        name: 'add',
        label: '加法',
        helper: '两个数字相加',
        parameters: [
          { name: 'a', type: 'number', label: '加数A', helper: '第一个加数' },
          { name: 'b', type: 'number', label: '加数B', helper: '第二个加数' }
        ],
        returns: {
          type: 'number',
          label: '和',
          helper: '加法结果'
        },
        body: `
          return a + b;
        `
      };

      const addFunction = fx.createFunction(functionDefinition);
      const result = await addFunction(3, 5);

      expect(result.result).toBe(8);
      expect(result.error).toBeUndefined();
      expect(result.executedInWorker).toBe(false);
    });

    it('应该支持默认参数', async () => {
      const fx = createFx();

      const functionDefinition: FunctionDefinition = {
        name: 'greet',
        label: '问候',
        helper: '生成问候消息',
        parameters: [
          { name: 'name', type: 'string', label: '姓名', helper: '要问候的人名', default: '世界' },
          { name: 'greeting', type: 'string', label: '问候语', helper: '问候的方式', default: '你好' }
        ],
        returns: {
          type: 'string',
          label: '问候消息',
          helper: '完整的问候消息'
        },
        body: `
          return greeting + ', ' + name + '!';
        `
      };

      const greetFunction = fx.createFunction(functionDefinition);

      // 使用默认参数
      const result1 = await greetFunction();
      expect(result1.result).toBe('你好, 世界!');

      // 传递参数
      const result2 = await greetFunction('张三', '嗨');
      expect(result2.result).toBe('嗨, 张三!');
    });

    it('应该验证参数类型', async () => {
      const fx = createFx();

      const functionDefinition: FunctionDefinition = {
        name: 'add',
        parameters: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' }
        ],
        returns: { type: 'number' },
        body: 'return arg0 + arg1;'
      };

      const addFunction = fx.createFunction(functionDefinition);

      // 传递错误类型应该抛出错误
      const result = await addFunction('3' as any, 5);
      expect(result.error).toContain('expects number');
    });
  });

  describe('Web Worker执行', () => {
    it('应该能够在Web Worker中执行函数', async () => {
      const fx = createFx({ useWebWorker: true });

      const functionDefinition: FunctionDefinition = {
        name: 'multiply',
        parameters: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' }
        ],
        returns: { type: 'number' },
        body: 'return a * b;'
      };

      const multiplyFunction = fx.createFunction(functionDefinition);
      const result = await multiplyFunction(6, 7);

      expect(result.result).toBe(42);
      expect(result.executedInWorker).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理执行错误', async () => {
      const fx = createFx();

      const functionDefinition: FunctionDefinition = {
        name: 'errorFunction',
        parameters: [],
        returns: { type: 'string' },
        body: `
          throw new Error('测试错误');
        `
      };

      const errorFunction = fx.createFunction(functionDefinition);
      const result = await errorFunction();

      expect(result.result).toBeUndefined();
      expect(result.error).toContain('测试错误');
    });

    it('应该处理超时', async () => {
      const fx = createFx({ timeout: 100 });

      const functionDefinition: FunctionDefinition = {
        name: 'timeoutFunction',
        parameters: [],
        returns: { type: 'string' },
        body: `
          // 模拟长时间运行
          const start = Date.now();
          while (Date.now() - start < 200) {
            // 忙等待
          }
          return '完成';
        `
      };

      const timeoutFunction = fx.createFunction(functionDefinition);
      const result = await timeoutFunction();

      expect(result.error).toContain('timeout');
    });
  });

  describe('安全执行', () => {
    it('应该限制危险的全局对象', async () => {
      const fx = createFx({
        forbiddenGlobals: ['eval', 'Function']
      });

      const functionDefinition: FunctionDefinition = {
        name: 'safeFunction',
        parameters: [],
        returns: { type: 'string' },
        body: `
          // 这应该被阻止
          try {
            // 在严格模式下eval不可用
            return 'eval不可用';
          } catch (e) {
            return 'eval被阻止';
          }
        `
      };

      const safeFunction = fx.createFunction(functionDefinition);
      const result = await safeFunction();

      // 由于安全限制，eval应该不可用
      expect(result.result).toBe('eval被阻止');
    });
  });
});
