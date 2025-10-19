设计一个模块，可以接受一个json定义的函数，将其构建成一个真实可执行的函数。
此json可以用于无码低码的场景，可以展示函数的参数和输出。

1.设计一个json结构可以定义一个函数，函数的入参基本结构为{name: 参数名, type: "string"|"number"|"bool"|"object"|..., label:展示的名称, default: 如果不传的话，默认值是什么, helper: 帮助描述}， default和helper不是必须的；函数的参数如果是对象，则使用前面的结构以树形的结构描述。其出参也是这种结构。函数体是一段代码字符串。 函数本身也有name, label, helper.
2.设计一个Fx的函数，接受1的json，可以生成一个可执行函数。
3.要特别注意函数体的执行安全问题，Fx可以设置两种模式：一种在web worker中执行， 一种是正常执行。


同时实现一个webpack的编译插件， 当我在类的函数上写了@fx, 例如：

```typescript
class X {
  /**
   * 两数之和: sum the two numbers —— 这会转化成{label: 两数据之和, helper: "sum the two numbers"}
   * @param a - 加数a: the first number  —— 这会转化成{label: 加数a, helper: "the first number"}
   * @param b - 加数b: the second number  —— 这会转化成{label: 加数b, helper: "the second number"}
   * @returns - 和: the sum of a and b —— 这会转化成{label: 和, helper: "the sum of a and b"}
   */
  @fx
  sum(a: number, b: number): number {
    return a + b;
  }
}
```
则会在编译时自动为sum生成一个json的描述, 如果注释上信息不足， label可以直接使用参数名，比如上面的a,b。 helper如果没有，则不生成。

如果函数的参数和返回值使用了一个 typescript 的类型，也需要生成对应的结构体描述json.

fx装饰器本身不做什么功能。
