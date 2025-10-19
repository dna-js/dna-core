# Com-Fx

一个用于动态生成和执行函数的TypeScript库，支持无代码/低代码场景。

## 特性

- 📝 **JSON定义函数**：通过JSON结构定义函数的参数、返回值和执行逻辑
- 🔒 **安全执行**：支持普通执行和Web Worker沙箱执行两种模式
- 🏷️ **装饰器支持**：提供`@fx`装饰器，配合webpack插件自动生成函数定义
- ⚡ **类型安全**：完整的TypeScript类型定义和运行时类型验证
- 🚀 **高性能**：支持编译时优化和运行时缓存

## 安装

```bash
npm install com-fx
```

## 快速开始

### 基本用法

```typescript
import { createFx } from 'com-fx';

// 定义一个函数
const functionDefinition = {
  name: 'add',
  label: '两数之和',
  helper: '计算两个数字的和',
  parameters: [
    { name: 'a', type: 'number', label: '加数A', helper: '第一个加数' },
    { name: 'b', type: 'number', label: '加数B', helper: '第二个加数' }
  ],
  returns: {
    type: 'number',
    label: '和',
    helper: '两个数字的和'
  },
  body: `
    return arg0 + arg1;
  `
};

// 创建Fx实例并生成函数
const fx = createFx();
const addFunction = fx.createFunction(functionDefinition);

// 执行函数
const result = await addFunction(3, 5);
console.log(result.result); // 输出: 8
```

### 使用装饰器

```typescript
import { fx } from 'com-fx';

/**
 * 两数之和: sum the two numbers
 * @param a - 加数a: the first number
 * @param b - 加数b: the second number
 * @returns - 和: the sum of a and b
 */
class Calculator {
  @fx
  sum(a: number, b: number): number {
    return a + b;
  }
}
```

使用webpack插件自动生成JSON定义：

```javascript
// webpack.config.js
const { FxWebpackPlugin } = require('com-fx');

module.exports = {
  // ... 其他配置
  plugins: [
    new FxWebpackPlugin({
      outputDir: 'fx-definitions',
      filename: 'fx-definitions.json'
    })
  ]
};
```

### 安全执行模式

```typescript
import { createFx } from 'com-fx';

// 普通执行模式
const fxNormal = createFx();

// Web Worker沙箱执行模式
const fxSecure = createFx({
  useWebWorker: true,
  timeout: 5000,
  forbiddenGlobals: ['eval', 'Function']
});
```

## API文档

### Fx类

#### 构造函数

```typescript
new Fx(options?: FxOptions)
```

#### FxOptions

```typescript
interface FxOptions {
  /** 是否在Web Worker中执行 */
  useWebWorker?: boolean;
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 允许的全局对象 */
  allowedGlobals?: string[];
  /** 禁止的全局对象 */
  forbiddenGlobals?: string[];
}
```

#### createFunction(definition)

创建可执行函数

```typescript
createFunction(definition: FunctionDefinition): (...args: any[]) => Promise<FxResult>
```

#### FunctionDefinition

```typescript
interface FunctionDefinition {
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
```

#### ParameterDefinition

```typescript
interface ParameterDefinition {
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
```

#### ReturnDefinition

```typescript
interface ReturnDefinition {
  /** 返回值类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'void';
  /** 展示名称 */
  label?: string;
  /** 帮助描述 */
  helper?: string;
  /** 子返回值（用于对象类型） */
  properties?: ParameterDefinition[];
}
```

#### FxResult

```typescript
interface FxResult<T = any> {
  /** 执行结果 */
  result: T;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 是否在Web Worker中执行 */
  executedInWorker: boolean;
  /** 错误信息（如果有） */
  error?: string;
}
```

### 装饰器

#### @fx

标记函数以便webpack插件处理：

```typescript
@fx
methodName(param: Type): ReturnType {
  // 函数体
}
```

#### fxWithOptions

带选项的装饰器：

```typescript
@fxWithOptions({ customOption: 'value' })
methodName(param: Type): ReturnType {
  // 函数体
}
```

### Webpack插件

#### FxWebpackPlugin

```javascript
new FxWebpackPlugin(options)
```

选项：

```typescript
interface FxWebpackPluginOptions {
  /** 输出目录 */
  outputDir?: string;
  /** 输出文件名 */
  filename?: string;
}
```

## 使用场景

### 无代码平台

Com-Fx非常适合构建无代码/低代码平台，用户可以通过可视化界面配置函数逻辑：

```typescript
// 用户在界面上配置的函数定义
const userFunction = {
  name: 'processData',
  parameters: [
    { name: 'input', type: 'object', label: '输入数据' }
  ],
  returns: { type: 'object', label: '处理结果' },
  body: `
    const result = { ...arg0, processed: true };
    return result;
  `
};

const fx = createFx({ useWebWorker: true }); // 安全执行
const processFunction = fx.createFunction(userFunction);
```

### 动态表单验证

```typescript
// 动态验证规则
const validationRule = {
  name: 'validateEmail',
  parameters: [
    { name: 'email', type: 'string' }
  ],
  returns: { type: 'boolean' },
  body: `
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(arg0);
  `
};

const validateEmail = fx.createFunction(validationRule);
```

### 数据处理管道

```typescript
// 数据转换函数
const transformers = [
  {
    name: 'toUpperCase',
    parameters: [{ name: 'text', type: 'string' }],
    returns: { type: 'string' },
    body: 'return arg0.toUpperCase();'
  },
  {
    name: 'trim',
    parameters: [{ name: 'text', type: 'string' }],
    returns: { type: 'string' },
    body: 'return arg0.trim();'
  }
];

const pipeline = transformers.map(def => fx.createFunction(def));
```

## 安全考虑

Com-Fx提供了多层安全保护：

1. **沙箱执行**：Web Worker模式下代码运行在独立线程中
2. **全局对象限制**：可配置允许和禁止的全局对象
3. **超时控制**：防止无限循环和长时间运行
4. **输入验证**：运行时类型检查和参数验证

## 开发和构建

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test

# 发布
npm run pub
```

## 示例

查看 `examples/` 目录中的完整示例，包括：

- 基本函数创建和执行
- Web Worker安全执行
- @fx装饰器使用
- webpack插件配置

## 许可证

MIT License
