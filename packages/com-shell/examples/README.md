# com-shell Example Application

This is an interactive demo application for the com-shell package.

## Features

### 1. Global Instance Check
- Verify that `window.$PageModelDB` is created
- Confirm singleton pattern (imported instance === window instance)

### 2. Debug Mode Control
- Enable/Disable debug mode
- Check current debug status
- Controls `localStorage.faker_page_model` flag

### 3. Logging Control
- Enable/Disable console logging
- Check logging status
- Controls `localStorage.page_model_log_enabled` flag

### 4. Layout Operations

#### Create Layout
Click "Create Layout" to open a modal where you can input:
- **Page Engine**: The engine identifier (e.g., `testEngine`, `mainEngine`)
- **Page Key**: The page identifier (e.g., `homePage`, `detailPage`)
- **Layout API Key**: The layout identifier (e.g., `mainLayout`, `v1`)

The layout will be created with default structure and saved to IndexedDB.

#### Get Layout
Click "Get Layout" to retrieve a specific layout by providing:
- Page Engine
- Page Key
- Layout API Key

#### Get All Layouts
Click "Get All Layouts" to display all stored layouts grouped by page.

#### Clear All
Click "Clear All" to remove all layouts from memory and IndexedDB.

## Running the Example

```bash
# Development server
npm run dev

# Open browser at http://localhost:9001
```

## Modal Usage

### Create Layout Modal
1. Click "Create Layout" button
2. Fill in the three required fields:
   - Page Engine
   - Page Key
   - Layout API Key
3. Click "Create" to save
4. Or click "Cancel" to close without saving
5. You can also click outside the modal to close it

### Get Layout Modal
1. Click "Get Layout" button
2. Fill in the three required fields
3. Click "Get" to retrieve the layout
4. Or click "Cancel" to close

## Console Tips

You can also interact with the API directly in the browser console:

```javascript
// Enable logging
window.$PageModelDB.enableLog()

// Create a layout programmatically
const layout = window.$PageModelDB.generateLayout('myEngine', 'myPage', 'myLayout')
await window.$PageModelDB.addOrUpdateLayout(layout)

// Get layout
const retrieved = window.$PageModelDB.getLayout('myEngine', 'myPage', 'myLayout')

// Get all layouts
const all = window.$PageModelDB.getAllLayouts()

// Clear all
await window.$PageModelDB.clearAllLayouts()
```
