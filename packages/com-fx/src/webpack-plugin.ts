import * as path from 'path';
import * as fs from 'fs';

/**
 * Fx Webpack插件
 * 在编译时处理@fx装饰器，从JSDoc注释中提取信息生成JSON描述
 */
export class FxWebpackPlugin {
  private options: {
    outputDir?: string;
    filename?: string;
  };

  constructor(options: { outputDir?: string; filename?: string } = {}) {
    this.options = {
      outputDir: 'fx-definitions',
      filename: 'fx-definitions.json',
      ...options
    };
  }

  apply(compiler: any) {
    compiler.hooks.compilation.tap('FxWebpackPlugin', (compilation: any) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'FxWebpackPlugin',
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          this.processSourceFiles(compilation);
        }
      );
    });
  }

  /**
   * 处理源文件，提取@fx装饰器和JSDoc信息
   */
  private processSourceFiles(compilation: any) {
    const definitions: any[] = [];

    // 遍历所有模块
    compilation.modules.forEach((module: any) => {
      if (module.resource && module.resource.endsWith('.ts')) {
        const source = module._source?._value || '';
        const definition = this.extractFxDefinition(module.resource, source);

        if (definition) {
          definitions.push(definition);
        }
      }
    });

    // 生成JSON文件
    if (definitions.length > 0) {
      const jsonContent = JSON.stringify(definitions, null, 2);
      const filename = this.options.filename!;
      const outputPath = path.join(this.options.outputDir!, filename);

      compilation.emitAsset(filename, new compilation.compiler.webpack.sources.RawSource(jsonContent));
    }
  }

  /**
   * 从源文件中提取Fx定义
   */
  private extractFxDefinition(filePath: string, source: string): any | null {
    // 正则表达式匹配@fx装饰器和相关信息
    const fxRegex = /@fx\s*\n\s*(\w+)\s*\(([^)]*)\)\s*:\s*([^;{]+)\s*{([^}]*)}/g;
    const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\s*\*\//;

    let match;
    while ((match = fxRegex.exec(source)) !== null) {
      const fullMatch = match[0];
      const functionName = match[1];
      const parameters = match[2];
      const returnType = match[3];
      const body = match[4];

      // 查找前面的JSDoc注释
      const beforeFunction = source.substring(0, match.index);
      const jsdocMatch = beforeFunction.match(jsdocRegex);

      if (jsdocMatch) {
        const jsdoc = jsdocMatch[1];
        const definition = this.parseJSDocAndFunction(jsdoc, functionName, parameters, returnType, body);

        if (definition) {
          return definition;
        }
      }
    }

    return null;
  }

  /**
   * 解析JSDoc和函数信息
   */
  private parseJSDocAndFunction(jsdoc: string, functionName: string, parameters: string, returnType: string, body: string): any | null {
    const definition: any = {
      name: functionName,
      parameters: [],
      returns: {
        type: this.parseTypeScriptType(returnType)
      },
      body: body.trim()
    };

    // 解析JSDoc
    const lines = jsdoc.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 解析函数描述
      if (trimmedLine.startsWith('*')) {
        const description = trimmedLine.substring(1).trim();

        // 查找冒号分割的中文和英文描述
        const colonIndex = description.indexOf(':');
        if (colonIndex > 0) {
          const beforeColon = description.substring(0, colonIndex).trim();
          const afterColon = description.substring(colonIndex + 1).trim();

          if (beforeColon && afterColon) {
            definition.label = beforeColon;
            definition.helper = afterColon;
          }
        }
      }

      // 解析@param标签
      const paramMatch = trimmedLine.match(/\*\s*@param\s+(\w+)\s*-\s*(.+)/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        const paramDescription = paramMatch[2];

        const colonIndex = paramDescription.indexOf(':');
        if (colonIndex > 0) {
          const beforeColon = paramDescription.substring(0, colonIndex).trim();
          const afterColon = paramDescription.substring(colonIndex + 1).trim();

          definition.parameters.push({
            name: paramName,
            label: beforeColon,
            helper: afterColon,
            type: this.extractTypeFromParameters(parameters, paramName)
          });
        }
      }

      // 解析@returns标签
      const returnsMatch = trimmedLine.match(/\*\s*@returns?\s*-\s*(.+)/);
      if (returnsMatch) {
        const returnsDescription = returnsMatch[1];

        const colonIndex = returnsDescription.indexOf(':');
        if (colonIndex > 0) {
          const beforeColon = returnsDescription.substring(0, colonIndex).trim();
          const afterColon = returnsDescription.substring(colonIndex + 1).trim();

          definition.returns.label = beforeColon;
          definition.returns.helper = afterColon;
        }
      }
    }

    // 如果没有从JSDoc中获取到label，使用函数名
    if (!definition.label) {
      definition.label = functionName;
    }

    return definition;
  }

  /**
   * 从函数参数中提取类型信息
   */
  private extractTypeFromParameters(parameters: string, paramName: string): string {
    const paramRegex = new RegExp(`\\b${paramName}\\s*:\\s*([^,]+)`, 'g');
    const match = paramRegex.exec(parameters);

    if (match) {
      return this.parseTypeScriptType(match[1].trim());
    }

    return 'any';
  }

  /**
   * 解析TypeScript类型
   */
  private parseTypeScriptType(typeString: string): string {
    // 简化版类型解析，实际实现可能需要更复杂的逻辑
    if (typeString.includes('string')) return 'string';
    if (typeString.includes('number')) return 'number';
    if (typeString.includes('boolean')) return 'boolean';
    if (typeString.includes('object') || typeString.includes('{')) return 'object';
    if (typeString.includes('[]') || typeString.includes('Array')) return 'array';

    return 'any';
  }
}
