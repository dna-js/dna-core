# fetch-record

一个强大的请求劫持和记录库，主要用于在前端开发应用时记录各请求的数据到 IndexDB 中。

## ✨ 特性

- 🎯 **自动劫持请求**：支持 `fetch` 和 `XMLHttpRequest` 的自动劫持
- 💾 **数据持久化**：将请求数据存储在 IndexDB 中
- 🔄 **回放功能**：可以从 IndexDB 优先获取数据，模拟离线环境
- 🎨 **可视化面板**：提供美观的 UI 界面管理请求记录
- 📤 **导入导出**：支持 JSON 格式的数据导入导出
- 🔧 **灵活配置**：支持记录和回放功能的独立开关
- 🎪 **正则匹配**：支持路径和参数的正则表达式匹配
- 🚀 **零侵入**：无需修改应用代码，自动初始化

## 📦 安装

```bash
npm install fetch-record idb
# or
yarn add fetch-record idb
```

## 🚀 快速开始

### 基础使用

```typescript
import { initFetchRecord } from 'fetch-record';

// 自动初始化（推荐）
// 库会在 DOM 加载完成后自动初始化

// 或手动初始化
const $FR = await initFetchRecord();

// 显示管理面板
$FR.showPanel();
```

### 在浏览器中直接使用

如果通过 `<script>` 标签引入，库会自动初始化，并在全局创建 `$FR` 变量：

```html
<script src="fetch-record.js"></script>
<script>
  // 直接使用全局 $FR
  $FR.showPanel();
</script>
```

## 🎯 使用场景

### 场景 1：后端服务中断时的演示

```typescript
// 1. 在正常环境下启用记录
$FR.enableRecord();

// 2. 操作应用，记录所有请求
// ... 用户操作 ...

// 3. 导出数据
const data = await $FR.exportData();

// 4. 在演示环境导入数据
await $FR.importData(data);

// 5. 启用回放模式
$FR.enableReplay();

// 现在所有请求都会优先从 IndexDB 获取
```

### 场景 2：录制 Demo 数据

```typescript
// 1. 在开发环境录制数据
$FR.enableRecord();

// 2. 完整操作一遍应用流程
// ... 各种操作 ...

// 3. 导出数据用于 Demo
const data = await $FR.exportData();
// 下载 JSON 文件

// 4. 在 Demo 环境导入并启用回放
await $FR.importData(data);
$FR.enableReplay();
```

## 🎨 管理面板

在浏览器控制台调用 `$FR.showPanel()` 可以打开管理面板：

### 面板功能

1. **配置开关**
   - 记录功能开关：控制是否记录新的请求
   - 回放功能开关：控制是否优先从 IndexDB 获取数据

2. **数据操作**
   - 导出数据：将所有记录导出为 JSON 文件
   - 导入数据：从 JSON 文件导入记录
   - 清空记录：删除所有记录

3. **请求列表**
   - 路径：请求的 URL 路径
   - 方法：HTTP 方法（GET、POST 等）
   - 参数：请求参数（点击查看详情）
   - 响应：响应数据（点击异步加载）
   - 时间：记录时间
   - 操作：删除单条记录

4. **编辑匹配规则**
   - 路径支持正则表达式
   - 参数 key 支持正则表达式
   - 灵活配置接口匹配规则

## 📚 API

### 全局变量 `$FR`

```typescript
interface FetchRecordAPI {
  // 显示/隐藏面板
  showPanel(): void;
  hidePanel(): void;
  
  // 配置管理
  getConfig(): FetchRecordConfig;
  updateConfig(config: Partial<FetchRecordConfig>): void;
  
  // 功能开关
  enableRecord(): void;   // 启用记录
  disableRecord(): void;  // 禁用记录
  enableReplay(): void;   // 启用回放
  disableReplay(): void;  // 禁用回放
  
  // 数据管理
  exportData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
  clearRecords(): Promise<void>;
}
```

### 配置选项

```typescript
interface FetchRecordConfig {
  enableRecord: boolean;  // 是否启用记录（默认：true）
  enableReplay: boolean;  // 是否启用回放（默认：false）
  dbName: string;        // IndexDB 数据库名
  storeName: string;     // IndexDB 存储名
}
```

### 请求记录格式

```typescript
interface RequestRecord {
  id: string;              // 唯一标识符（path + params hash）
  path: string;            // 请求路径（支持正则）
  method: HttpMethod;      // 请求方法
  params: any;             // 请求参数
  response: any;           // 响应数据
  headers?: Record<string, string>;  // 请求头
  timestamp: number;       // 记录时间
  matchRule?: ParamMatchRule;  // 参数匹配规则
}
```

## 🔧 高级功能

### 接口唯一性规则

接口的唯一性由以下规则确定：
- **路径**：不包含域名的 URL 路径
- **参数 Hash**：请求参数 JSON 字符串的 hash 值

例如：
```
/api/users + {"id": 1} => /api/users_abc123
/api/users + {"id": 2} => /api/users_def456
```

### 正则表达式匹配

#### 路径匹配

```typescript
// 精确匹配
record.path = "/api/users";

// 正则匹配所有 user 相关接口
record.path = "/api/user.*";

// 匹配所有 POST 到 /api 的请求
record.path = "/api/.*";
```

#### 参数匹配

在面板中点击"编辑匹配规则"，可以为参数设置匹配规则：

```json
{
  "id": "\\d+",           // id 必须是数字
  "name": ".*test.*",     // name 包含 "test"
  "status": "active|pending"  // status 是 active 或 pending
}
```

### 导入导出数据格式

```typescript
interface ExportData {
  version: string;        // 版本号
  timestamp: number;      // 导出时间
  records: RequestRecord[];  // 所有记录
}
```

导出的 JSON 文件示例：
```json
{
  "version": "1.0.0",
  "timestamp": 1699999999999,
  "records": [
    {
      "id": "/api/users_abc123",
      "path": "/api/users",
      "method": "GET",
      "params": { "id": 1 },
      "response": { "id": 1, "name": "John" },
      "timestamp": 1699999999999
    }
  ]
}
```

## 🔒 LocalStorage 配置

配置会自动保存到 localStorage：

- `fetch-record-config`: 完整配置对象
- `fetch-record-enable-record`: 记录开关
- `fetch-record-enable-replay`: 回放开关

可以手动修改这些值来控制功能：

```javascript
// 关闭记录
localStorage.setItem('fetch-record-enable-record', 'false');

// 开启回放
localStorage.setItem('fetch-record-enable-replay', 'true');
```

## 🎬 示例

### 示例 1：基础使用

```typescript
import { initFetchRecord } from 'fetch-record';

// 初始化
const $FR = await initFetchRecord();

// 发起请求（自动被拦截和记录）
const response = await fetch('/api/users');
const data = await response.json();

// 查看记录
$FR.showPanel();
```

### 示例 2：配置管理

```typescript
// 查看当前配置
const config = $FR.getConfig();
console.log(config);

// 更新配置
$FR.updateConfig({
  enableRecord: true,
  enableReplay: false
});

// 或使用便捷方法
$FR.enableRecord();
$FR.disableReplay();
```

### 示例 3：数据管理

```typescript
// 导出所有数据
const data = await $FR.exportData();
console.log(`共有 ${data.records.length} 条记录`);

// 导入数据
const importedData = { /* ... */ };
await $FR.importData(importedData);

// 清空所有记录
await $FR.clearRecords();
```

## 📋 开发

### 构建

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（启动示例）
npm run dev

# 测试
npm run test
```

### 项目结构

```
fetch-record/
├── src/
│   ├── types.ts          # 类型定义
│   ├── db-manager.ts     # IndexDB 管理
│   ├── config.ts         # 配置管理
│   ├── utils.ts          # 工具函数
│   ├── interceptor.ts    # 请求拦截器
│   ├── ui-panel.ts       # UI 面板
│   ├── fetch-record.ts   # 主类
│   └── index.ts          # 入口文件
├── examples/             # 示例
├── dist/                 # 构建输出
├── package.json
├── tsconfig.json
├── rollup.config.js
└── readme.md
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## ⚠️ 注意事项

1. **性能影响**：记录大量请求可能会影响性能，建议只在开发环境使用
2. **数据安全**：请求数据存储在本地 IndexDB，包含敏感信息时请注意安全
3. **浏览器兼容**：需要支持 IndexDB 的现代浏览器
4. **跨域问题**：回放功能对跨域请求可能有限制

## 🔗 相关链接

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
