# com-shell

This library provides tools for managing page model data storage using IndexedDB for debugging purposes.

## Description

A debugging utility for storing and retrieving page layout data using IndexedDB. It provides an interface to persist component configurations and layout information for development and testing scenarios.

## Installation

```bash
npm install com-shell
# or
yarn add com-shell
```

## Core Concepts

*   **`pageModelDB`**: The main database instance for managing layout data
*   **`XComLayout`**: Class representing a component layout with metadata
*   **`ComArgs`**: Type definition for component arguments and configuration

## Basic Usage

```typescript
import { pageModelDB, XComLayout } from 'com-shell';

// Enable debugging mode
pageModelDB.enable();

// The instance is also available globally as window.$PageModelDB
// This ensures a single instance across multiple applications

// Check if debugging is enabled
if (pageModelDB.isEnabled()) {
  // Create a new layout
  const layout = pageModelDB.generateLayout('engine1', 'page1', 'layout1');

  // Set layout properties
  layout.setLayoutLabel('My Layout');

  // Add or update layout in database
  await pageModelDB.addOrUpdateLayout(layout);

  // Retrieve layout
  const retrievedLayout = pageModelDB.getLayout('engine1', 'page1', 'layout1');
}

// Control logging output
pageModelDB.enableLog();  // Enable console logging
pageModelDB.disableLog(); // Disable console logging

// Access from console
window.$PageModelDB?.enable();     // Enable debugging
window.$PageModelDB?.disable();    // Disable debugging
window.$PageModelDB?.enableLog();  // Enable logging
window.$PageModelDB?.disableLog(); // Disable logging
```

### Logging Behavior

The package includes smart logging control:

- **Debug logs**: Only shown when `enableLog()` is called
- **Error logs**: Always shown (cannot be disabled)
- **Warning logs**: Only shown when logging is enabled
- All logs are prefixed with `[PageModelDB]` for easy filtering

```typescript
// Enable logging to see debug information
pageModelDB.enableLog();

// Now operations will log to console
await pageModelDB.addOrUpdateLayout(layout);
// Console: [PageModelDB] Layout added successfully

// Disable logging for cleaner console
pageModelDB.disableLog();
```

## API

### Exports

*   `pageModelDB`: Main database instance for layout operations
*   `XComLayout`: Class for representing component layouts
*   `ComArgs`: Type for component configuration data

### pageModelDB Methods

#### Debug Mode Control
*   `enable()`: Enable debugging mode (sets localStorage flag)
*   `disable()`: Disable debugging mode (clears localStorage flag)
*   `isEnabled()`: Check if debugging mode is enabled

#### Logging Control
*   `enableLog()`: Enable console logging (sets localStorage.page_model_log_enabled)
*   `disableLog()`: Disable console logging (clears localStorage.page_model_log_enabled)
*   `isLogEnabled()`: Check if logging is enabled

#### Layout Operations
*   `getLayout(pageEngine, pageKey, layoutApiKey)`: Retrieve a specific layout
*   `addOrUpdateLayout(layout)`: Add or update a layout
*   `deleteLayout(pageEngine, pageKey, layoutApiKey)`: Delete a layout
*   `getAllLayouts()`: Get all layouts
*   `clearAllLayouts()`: Clear all stored layouts
*   `generateLayout(pageEngine, pageKey, layoutApiKey)`: Create a new layout instance

### Global Access

The package ensures a **single global instance** across multiple applications:

*   When the module is loaded, it creates or reuses `window.$PageModelDB`
*   This ensures that even if multiple apps import the package, they share the same instance
*   You can access it directly from the browser console: `window.$PageModelDB`

## Development

### Building

```bash
npm run build
# or
yarn build
```

### Testing

```bash
npm run test
# or
yarn test
```
