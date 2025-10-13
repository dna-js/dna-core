import { pageModelDB, XComLayout } from '../src/index';

// Make functions globally available for onclick handlers
declare global {
  interface Window {
    checkGlobalInstance: () => void;
    enableDebug: () => void;
    disableDebug: () => void;
    checkStatus: () => void;
    enableLogging: () => void;
    disableLogging: () => void;
    checkLogStatus: () => void;
    createLayout: () => void;
    getLayout: () => void;
    getAllLayouts: () => void;
    clearAll: () => void;
    closeModal: () => void;
    closeGetModal: () => void;
  }
}

// Check global instance
window.checkGlobalInstance = () => {
  const status = document.getElementById('global-status');
  if (status) {
    const hasGlobal = typeof window.$PageModelDB !== 'undefined';
    const isSameInstance = window.$PageModelDB === pageModelDB;
    status.innerHTML = `
      <strong>Global Instance Check:</strong><br>
      window.$PageModelDB exists: ${hasGlobal}<br>
      Is same as imported instance: ${isSameInstance}<br>
      <pre>console: window.$PageModelDB</pre>
    `;
  }
  console.log('window.$PageModelDB:', window.$PageModelDB);
  console.log('pageModelDB:', pageModelDB);
  console.log('Same instance:', window.$PageModelDB === pageModelDB);
};

// Enable debug mode
window.enableDebug = () => {
  pageModelDB.enable();
  const status = document.getElementById('status');
  if (status) {
    status.innerHTML = '<strong>Debug mode enabled!</strong><br>localStorage.faker_page_model = true';
  }
};

// Disable debug mode
window.disableDebug = () => {
  pageModelDB.disable();
  const status = document.getElementById('status');
  if (status) {
    status.innerHTML = '<strong>Debug mode disabled!</strong><br>localStorage.faker_page_model = false';
  }
};

// Check status
window.checkStatus = () => {
  const isEnabled = pageModelDB.isEnabled();
  const status = document.getElementById('status');
  if (status) {
    status.innerHTML = `<strong>Debug Status:</strong> ${isEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
  }
};

// Enable logging
window.enableLogging = () => {
  pageModelDB.enableLog();
  const status = document.getElementById('log-status');
  if (status) {
    status.innerHTML = '<strong>Logging enabled!</strong><br>Check console for debug logs';
  }
};

// Disable logging
window.disableLogging = () => {
  pageModelDB.disableLog();
  const status = document.getElementById('log-status');
  if (status) {
    status.innerHTML = '<strong>Logging disabled!</strong><br>Only errors will be shown';
  }
};

// Check log status
window.checkLogStatus = () => {
  const isLogEnabled = pageModelDB.isLogEnabled();
  const status = document.getElementById('log-status');
  if (status) {
    status.innerHTML = `<strong>Logging Status:</strong> ${isLogEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
  }
};

// Modal control functions
window.closeModal = () => {
  const modal = document.getElementById('createModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.closeGetModal = () => {
  const modal = document.getElementById('getModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// Create a layout - open modal
window.createLayout = () => {
  const modal = document.getElementById('createModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

// Handle create layout form submission
const createLayoutForm = document.getElementById('createLayoutForm') as HTMLFormElement;
if (createLayoutForm) {
  createLayoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const pageEngine = (document.getElementById('pageEngine') as HTMLInputElement).value;
    const pageKey = (document.getElementById('pageKey') as HTMLInputElement).value;
    const layoutApiKey = (document.getElementById('layoutApiKey') as HTMLInputElement).value;

    const layout = pageModelDB.generateLayout(pageEngine, pageKey, layoutApiKey);
    layout.setLayoutLabel(`Layout for ${pageKey}`);
    
    await pageModelDB.addOrUpdateLayout(layout);

    const status = document.getElementById('layout-status');
    if (status) {
      status.innerHTML = `
        <strong>Layout Created!</strong><br>
        <strong>Page Engine:</strong> ${pageEngine}<br>
        <strong>Page Key:</strong> ${pageKey}<br>
        <strong>Layout API Key:</strong> ${layoutApiKey}<br>
        <pre>${JSON.stringify(layout.toJSON(), null, 2)}</pre>
      `;
    }
    console.log('Created layout:', layout);

    // Close modal and reset form
    window.closeModal();
    createLayoutForm.reset();
  });
}

// Get layout - open modal
window.getLayout = () => {
  const modal = document.getElementById('getModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

// Handle get layout form submission
const getLayoutForm = document.getElementById('getLayoutForm') as HTMLFormElement;
if (getLayoutForm) {
  getLayoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const pageEngine = (document.getElementById('getPageEngine') as HTMLInputElement).value;
    const pageKey = (document.getElementById('getPageKey') as HTMLInputElement).value;
    const layoutApiKey = (document.getElementById('getLayoutApiKey') as HTMLInputElement).value;

    const layout = pageModelDB.getLayout(pageEngine, pageKey, layoutApiKey);
    const status = document.getElementById('layout-status');
    
    if (status) {
      if (layout) {
        status.innerHTML = `
          <strong>Layout Retrieved!</strong><br>
          <strong>Page Engine:</strong> ${pageEngine}<br>
          <strong>Page Key:</strong> ${pageKey}<br>
          <strong>Layout API Key:</strong> ${layoutApiKey}<br>
          <pre>${JSON.stringify(layout.toJSON(), null, 2)}</pre>
        `;
      } else {
        status.innerHTML = `
          <strong>No layout found.</strong><br>
          Page Engine: ${pageEngine}, Page Key: ${pageKey}, Layout API Key: ${layoutApiKey}
        `;
      }
    }
    console.log('Retrieved layout:', layout);

    // Close modal and reset form
    window.closeGetModal();
    getLayoutForm.reset();
  });
}

// Get all layouts
window.getAllLayouts = () => {
  const allLayouts = pageModelDB.getAllLayouts();
  const status = document.getElementById('layout-status');
  const layoutsArray: any[] = [];
  
  allLayouts.forEach((layouts, key) => {
    layoutsArray.push({
      key,
      layouts: layouts.map(l => l.toJSON())
    });
  });

  if (status) {
    status.innerHTML = `
      <strong>All Layouts (${layoutsArray.length} pages):</strong><br>
      <pre>${JSON.stringify(layoutsArray, null, 2)}</pre>
    `;
  }
  console.log('All layouts:', allLayouts);
};

// Clear all layouts
window.clearAll = async () => {
  await pageModelDB.clearAllLayouts();
  const status = document.getElementById('layout-status');
  if (status) {
    status.innerHTML = '<strong>All layouts cleared!</strong>';
  }
  console.log('All layouts cleared');
};

// Close modals when clicking outside
window.onclick = (event) => {
  const createModal = document.getElementById('createModal');
  const getModal = document.getElementById('getModal');
  
  if (event.target === createModal) {
    window.closeModal();
  }
  if (event.target === getModal) {
    window.closeGetModal();
  }
};

// Initial check
console.log('=== com-shell initialized ===');
console.log('pageModelDB:', pageModelDB);
console.log('window.$PageModelDB:', window.$PageModelDB);
console.log('Same instance:', pageModelDB === window.$PageModelDB);
console.log('\nTip: Enable logging with pageModelDB.enableLog() to see debug messages');
