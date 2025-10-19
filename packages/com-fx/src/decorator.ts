/**
 * Fx装饰器 - 标记函数以便webpack插件处理
 * 装饰器本身不做任何功能，只是一个标记
 */
export function fx(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  // 装饰器本身不做任何功能，只是标记
  // webpack插件会在编译时处理这个标记
  return descriptor;
}

/**
 * Fx装饰器工厂 - 可以传递选项
 */
export function fxWithOptions(options: any = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // 装饰器本身不做任何功能，只是标记
    // webpack插件会在编译时处理这个标记和选项
    return descriptor;
  };
}
