/**
 * Com-Fx 示例文件
 * 演示如何使用@fx装饰器和Fx类
 */

// 导入Fx装饰器
import { fx } from '../src/decorator';

/**
 * 两数之和函数示例
 * 两数之和: sum the two numbers —— 这会转化成{label: 两数据之和, helper: "sum the two numbers"}
 * @param a - 加数a: the first number  —— 这会转化成{label: 加数a, helper: "the first number"}
 * @param b - 加数b: the second number  —— 这会转化成{label: 加数b, helper: "the second number"}
 * @returns - 和: the sum of a and b —— 这会转化成{label: 和, helper: "the sum of a and b"}
 */
export class Calculator {
  @fx
  sum(a: number, b: number): number {
    return a + b;
  }

  /**
   * 两数之积函数示例
   * 两数之积: multiply two numbers —— 计算两个数字的乘积
   * @param x - 乘数x: the first number —— 第一个乘数
   * @param y - 乘数y: the second number —— 第二个乘数
   * @returns - 积: the product of x and y —— 两个数字的乘积
   */
  @fx
  multiply(x: number, y: number): number {
    return x * y;
  }

  /**
   * 字符串拼接函数示例
   * 字符串拼接: concatenate strings —— 将多个字符串连接起来
   * @param first - 第一个字符串: the first string —— 第一个要连接的字符串
   * @param second - 第二个字符串: the second string —— 第二个要连接的字符串
   * @param separator - 分隔符: the separator —— 用于连接字符串的分隔符
   * @returns - 连接结果: the concatenated result —— 连接后的字符串
   */
  @fx
  concatenate(first: string, second: string, separator: string = ' '): string {
    return first + separator + second;
  }
}

// 示例：如何使用Fx类动态创建函数
import { createFx, FunctionDefinition } from '../src/index';

// 创建一个动态的函数定义
const dynamicFunctionDefinition: FunctionDefinition = {
  name: 'power',
  label: '幂运算',
  helper: '计算底数的幂次方',
  parameters: [
    { name: 'base', type: 'number', label: '底数', helper: '底数的值' },
    { name: 'exponent', type: 'number', label: '指数', helper: '指数的值' }
  ],
  returns: {
    type: 'number',
    label: '结果',
    helper: '幂运算的结果'
  },
  body: `
    return Math.pow(arg0, arg1);
  `
};

// 创建Fx实例并生成函数
const fx = createFx();
export const powerFunction = fx.createFunction(dynamicFunctionDefinition);

// 导出计算器实例供示例页面使用
export const calculator = new Calculator();
