# Test Guide for com-shell

## Testing the Logging Feature

### 1. Test Logging Control

```javascript
// In browser console:

// Check initial state
window.$PageModelDB.isLogEnabled()
// Expected: false (or true if previously enabled)

// Enable logging
window.$PageModelDB.enableLog()
// Expected: Console shows "PageModelDB logging enabled"

// Verify logging is enabled
window.$PageModelDB.isLogEnabled()
// Expected: true

// Disable logging
window.$PageModelDB.disableLog()
// Expected: Console shows "PageModelDB logging disabled"
```

### 2. Test Debug Mode

```javascript
// Enable debug mode
window.$PageModelDB.enable()
// Expected: Console shows "[PageModelDB] PageModelDB debug mode enabled" (only if logging is enabled)

// Check status
window.$PageModelDB.isEnabled()
// Expected: true

// Disable debug mode
window.$PageModelDB.disable()
// Expected: Console shows "[PageModelDB] PageModelDB debug mode disabled" (only if logging is enabled)
```

### 3. Test Layout Operations with Logging

```javascript
// Enable logging to see all operations
window.$PageModelDB.enableLog()

// Create a layout
const layout = window.$PageModelDB.generateLayout('testEngine', 'testPage', 'testLayout')
layout.setLayoutLabel('Test Layout')

// Add layout (should log)
await window.$PageModelDB.addOrUpdateLayout(layout)
// Expected: Console shows "[PageModelDB] Layout added successfully"

// Get layout (no log - only operations log)
const retrieved = window.$PageModelDB.getLayout('testEngine', 'testPage', 'testLayout')

// Delete layout (should log)
await window.$PageModelDB.deleteLayout('testEngine', 'testPage', 'testLayout')
// Expected: Console shows "[PageModelDB] Layout deleted successfully"

// Disable logging
window.$PageModelDB.disableLog()

// Operations won't log now, but errors still will
```

### 4. Test Global Instance

```javascript
// Import in different modules should return same instance
import { pageModelDB } from 'com-shell'

console.log(pageModelDB === window.$PageModelDB)
// Expected: true
```

## Expected Console Output

### With Logging Enabled:
```
[PageModelDB] Global instance created
[PageModelDB] IndexedDB opened successfully
[PageModelDB] Loaded data from IndexedDB successfully, total pages: 0
[PageModelDB] PageModelDB debug mode enabled
[PageModelDB] Layout added successfully
[PageModelDB] Layout deleted successfully
```

### With Logging Disabled:
```
[PageModelDB] Global instance created  (always shown)
(No other logs except errors)
```

### Errors (Always Shown):
```
[PageModelDB] Failed to open IndexedDB: ...
[PageModelDB] Failed to load data from IndexedDB: ...
[PageModelDB] Failed to add layout: ...
```

## LocalStorage Keys

The module uses these localStorage keys:

1. `faker_page_model` - Debug mode flag (`'true'` or `'false'`)
2. `page_model_log_enabled` - Logging flag (`'true'` or `'false'`)

You can check them in DevTools > Application > Local Storage
