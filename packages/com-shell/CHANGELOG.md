# Changelog

## [0.1.0] - 2024-10-13

### Added
- Initial release of com-shell package
- IndexedDB-based page model storage system
- `XComLayout` class for managing component layouts
- `pageModelDB` singleton instance for database operations
- Global window access via `window.$PageModelDB`
- Debug mode control (`enable()`, `disable()`, `isEnabled()`)
- Logging control system:
  - `enableLog()` - Enable debug logging
  - `disableLog()` - Disable debug logging
  - `isLogEnabled()` - Check logging status
- Smart logging with `[PageModelDB]` prefix:
  - Debug logs only shown when logging enabled
  - Error logs always shown
  - Warning logs controlled by logging flag
- Global singleton pattern ensuring single instance across multiple apps
- Layout operations:
  - `getLayout()` - Retrieve layouts
  - `addOrUpdateLayout()` - Create or update layouts
  - `deleteLayout()` - Remove layouts
  - `getAllLayouts()` - Get all layouts
  - `clearAllLayouts()` - Clear all layouts
  - `generateLayout()` - Create layout instances
- Complete TypeScript type definitions
- Example application with interactive demo
- Comprehensive documentation

### Technical Details
- All console logs converted to English
- localStorage keys:
  - `faker_page_model` - Debug mode flag
  - `page_model_log_enabled` - Logging control flag
- Fallback support for non-browser environments
- Full ES Module and CommonJS support
