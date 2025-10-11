# 快速开始指南

## 安装

```bash
npm install fetch-record idb
```

## 5 分钟上手

### 1. 引入并初始化

```typescript
import { initFetchRecord } from 'fetch-record';

// 库会自动初始化，创建全局 $FR 变量
// 或者手动初始化
const $FR = await initFetchRecord();
```

### 2. 发起请求（自动记录）

```typescript
// 正常使用 fetch 或 XMLHttpRequest
const response = await fetch('/api/users');
const data = await response.json();

// 请求已被自动记录到 IndexDB
```

### 3. 查看记录

```typescript
// 在控制台或代码中调用
$FR.showPanel();
```

## 常用场景

### 场景 1：开发时记录数据

```typescript
// 1. 确保记录功能开启（默认开启）
$FR.enableRecord();

// 2. 正常开发和测试
// ... 操作应用 ...

// 3. 打开面板查看所有记录
$FR.showPanel();

// 4. 导出数据
const data = await $FR.exportData();
// 自动下载 JSON 文件
```

### 场景 2：演示模式（离线）

```typescript
// 1. 导入之前导出的数据
await $FR.importData(demoData);

// 2. 启用回放模式
$FR.enableReplay();

// 3. 现在所有匹配的请求都会从 IndexDB 返回
// 无需真实后端服务
```

### 场景 3：调试特定接口

```typescript
// 1. 打开面板
$FR.showPanel();

// 2. 找到目标接口记录

// 3. 点击"编辑匹配规则"

// 4. 设置路径和参数的正则匹配规则
{
  "path": "/api/users/.*",  // 匹配所有 users 子路径
  "matchRule": {
    "id": "\\d+"  // id 必须是数字
  }
}

// 5. 保存，现在这个规则会匹配多个相似请求
```

## 控制台快捷命令

```javascript
// 显示/隐藏面板
$FR.showPanel()
$FR.hidePanel()

// 功能开关
$FR.enableRecord()   // 开启记录
$FR.disableRecord()  // 关闭记录
$FR.enableReplay()   // 开启回放
$FR.disableReplay()  // 关闭回放

// 数据管理
$FR.exportData()     // 导出数据
$FR.clearRecords()   // 清空所有记录

// 查看配置
$FR.getConfig()
```

## 配置选项

```typescript
// 更新配置
$FR.updateConfig({
  enableRecord: true,  // 是否记录请求
  enableReplay: false, // 是否启用回放
});

// 或使用 localStorage
localStorage.setItem('fetch-record-enable-record', 'true');
localStorage.setItem('fetch-record-enable-replay', 'false');
```

## 注意事项

1. **开发环境使用**：记录功能会影响性能，建议只在开发环境使用
2. **数据安全**：请求数据包含在本地 IndexDB 中，注意敏感信息
3. **回放模式**：启用回放后，匹配的请求不会发送到真实服务器
4. **存储空间**：大量请求会占用存储空间，定期清理

## 问题排查

### 请求没有被记录？

检查：
1. 记录功能是否开启：`$FR.getConfig().enableRecord`
2. 控制台是否有错误信息
3. IndexDB 是否可用（浏览器隐私模式可能禁用）

### 回放不生效？

检查：
1. 回放功能是否开启：`$FR.getConfig().enableReplay`
2. 请求路径和参数是否匹配记录中的数据
3. 查看控制台日志确认匹配状态

### 面板无法打开？

检查：
1. 是否有 JavaScript 错误
2. 是否被页面的 CSS 遮挡（面板 z-index 很高）
3. 尝试刷新页面重新初始化

## 更多信息

详细文档请查看 [README.md](./readme.md)

