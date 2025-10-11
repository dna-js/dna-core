import { initFetchRecord } from '../src/index';

// 等待初始化
let $FR: any;

(async () => {
  try {
    $FR = await initFetchRecord();
    console.log('✅ FetchRecord initialized');
    addLog('✅ FetchRecord 初始化成功');
  } catch (error) {
    console.error('❌ Failed to initialize FetchRecord:', error);
    addLog('❌ FetchRecord 初始化失败: ' + error);
  }
})();

// 日志工具
function addLog(message: string): void {
  const logContainer = document.getElementById('log');
  if (logContainer) {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

function clearLog(): void {
  const logContainer = document.getElementById('log');
  if (logContainer) {
    logContainer.innerHTML = '<div class="log-item">日志已清空</div>';
  }
}

// 面板控制
(window as any).showPanel = () => {
  if ($FR) {
    $FR.showPanel();
    addLog('显示面板');
  }
};

(window as any).hidePanel = () => {
  if ($FR) {
    $FR.hidePanel();
    addLog('隐藏面板');
  }
};

// 测试请求
(window as any).testFetchGet = async () => {
  try {
    addLog('发送 Fetch GET 请求...');
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const data = await response.json();
    addLog(`✅ Fetch GET 成功: ${JSON.stringify(data).substring(0, 50)}...`);
    console.log('Fetch GET response:', data);
  } catch (error) {
    addLog(`❌ Fetch GET 失败: ${error}`);
    console.error('Fetch GET error:', error);
  }
};

(window as any).testFetchPost = async () => {
  try {
    addLog('发送 Fetch POST 请求...');
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Post',
        body: 'This is a test post from Fetch Record',
        userId: 1,
      }),
    });
    const data = await response.json();
    addLog(`✅ Fetch POST 成功: ${JSON.stringify(data).substring(0, 50)}...`);
    console.log('Fetch POST response:', data);
  } catch (error) {
    addLog(`❌ Fetch POST 失败: ${error}`);
    console.error('Fetch POST error:', error);
  }
};

(window as any).testXHRGet = () => {
  addLog('发送 XHR GET 请求...');
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://jsonplaceholder.typicode.com/posts/2');
  xhr.onload = function() {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      addLog(`✅ XHR GET 成功: ${JSON.stringify(data).substring(0, 50)}...`);
      console.log('XHR GET response:', data);
    }
  };
  xhr.onerror = function() {
    addLog(`❌ XHR GET 失败`);
    console.error('XHR GET error');
  };
  xhr.send();
};

(window as any).testXHRPost = () => {
  addLog('发送 XHR POST 请求...');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://jsonplaceholder.typicode.com/posts');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    if (xhr.status === 201) {
      const data = JSON.parse(xhr.responseText);
      addLog(`✅ XHR POST 成功: ${JSON.stringify(data).substring(0, 50)}...`);
      console.log('XHR POST response:', data);
    }
  };
  xhr.onerror = function() {
    addLog(`❌ XHR POST 失败`);
    console.error('XHR POST error');
  };
  xhr.send(JSON.stringify({
    title: 'Test XHR Post',
    body: 'This is a test post from XHR',
    userId: 1,
  }));
};

(window as any).testMultipleRequests = async () => {
  addLog('开始批量测试...');
  
  const requests = [
    fetch('https://jsonplaceholder.typicode.com/posts/1'),
    fetch('https://jsonplaceholder.typicode.com/posts/2'),
    fetch('https://jsonplaceholder.typicode.com/posts/3'),
    fetch('https://jsonplaceholder.typicode.com/users/1'),
    fetch('https://jsonplaceholder.typicode.com/comments?postId=1'),
  ];
  
  try {
    await Promise.all(requests);
    addLog('✅ 批量测试完成（5个请求）');
  } catch (error) {
    addLog(`❌ 批量测试失败: ${error}`);
  }
};

// 配置管理
(window as any).enableRecord = () => {
  if ($FR) {
    $FR.enableRecord();
    addLog('✅ 记录功能已启用');
  }
};

(window as any).disableRecord = () => {
  if ($FR) {
    $FR.disableRecord();
    addLog('⚠️ 记录功能已禁用');
  }
};

(window as any).enableReplay = () => {
  if ($FR) {
    $FR.enableReplay();
    addLog('✅ 回放功能已启用（优先从 IndexDB 获取数据）');
  }
};

(window as any).disableReplay = () => {
  if ($FR) {
    $FR.disableReplay();
    addLog('⚠️ 回放功能已禁用');
  }
};

(window as any).showConfig = () => {
  if ($FR) {
    const config = $FR.getConfig();
    addLog(`当前配置: ${JSON.stringify(config, null, 2)}`);
    console.log('Current config:', config);
  }
};

// 数据管理
(window as any).exportData = async () => {
  if ($FR) {
    try {
      const data = await $FR.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fetch-record-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`✅ 数据已导出（${data.records.length} 条记录）`);
    } catch (error) {
      addLog(`❌ 导出失败: ${error}`);
    }
  }
};

(window as any).clearData = async () => {
  if ($FR && confirm('确定要清空所有记录吗？')) {
    try {
      await $FR.clearRecords();
      addLog('✅ 所有记录已清空');
    } catch (error) {
      addLog(`❌ 清空失败: ${error}`);
    }
  }
};

(window as any).clearLog = clearLog;

// 将 $FR 暴露到全局
(window as any).$FR = $FR;

