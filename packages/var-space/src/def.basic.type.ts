// Basic data types
export type NativeType = 'Object' 
| 'String' 
| 'Number' 
| 'Boolean' 
| 'DateTime' 
| 'Time' 
| 'Date' 
| "Unknown"

/**
 * Variable metadata structure
 */
export type VarDesc = {
  /**
   * Corresponding primitive type
   */
  type: NativeType

  /**
   * Writable?
   */
  writable?: boolean
  /**
   * Enumerable?
   */
  enumerable?: boolean
  /**
   * Observable?
   * - If true, will trigger update events
   */
  observable?: boolean
  /**
   * Is this variable metadata configurable?
   * - Reserved, not implemented
   */
  configurable?: boolean
  /**
   * Property label, displayed in variable selection in designer scenarios
   * - If not set, the variable name will be used as the label
   */
  label?: string

  /**
   * Additional description information
   */
  info?: string
}

/**
 * Get the default value corresponding to the JS primitive type
 * @param type 
 * @returns 
 */
export function getDefaultValue(type: NativeType): any {
  switch (type) {
    case 'Object': return {}
    case 'String': return ''
    case 'Number': return 0
    case 'Boolean': return false
    case 'Date':
    case 'DateTime':
    case 'Time':
      return (new Date()).getTime()
    default: return undefined
  }
}

/**
 * Get default variable metadata
 * @returns 
 */
export function getDefaultDescriptor(type: NativeType): VarDesc {
  return {
    type,
    writable: true,
    enumerable: true,
    observable: false,
    configurable: true,
    label: '',
  }
}


// Type metadata storage (singleton)
export const BasicTypeMeta = new Map<NativeType, VarDesc>();

// Initialize type metadata
(function initializeMeta() {
  const basicMeta = {
    writable: true,
    enumerable: true,
    configurable: false,
    observable: false
  }

  BasicTypeMeta.set('String', { ...basicMeta, type: 'String' })
  BasicTypeMeta.set('Number', { ...basicMeta, type: 'Number' })
  BasicTypeMeta.set('Boolean', { ...basicMeta, type: 'Boolean' })
  BasicTypeMeta.set('Object', { ...basicMeta, type: 'Object' })
  BasicTypeMeta.set('Date', { ...basicMeta, type: 'Date' })
  BasicTypeMeta.set('DateTime', { ...basicMeta, type: 'DateTime' })
  BasicTypeMeta.set('Time', { ...basicMeta, type: 'Time' })
})()

export function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

/**
 * Infer variable type based on value
 * - Numerical Date values will be inferred as Number type
 * @param val 
 * @returns 
 */
export function inferVarType(val: any): NativeType {
  if (val === undefined) return 'Unknown'
  const type = typeof val
  
  switch (type) {
    case 'string': return 'String'
    case 'number': return 'Number'
    case 'boolean': return 'Boolean'
    case 'object': 
      if (val instanceof Date) return 'Date'
      if (isPlainObject(val)) return 'Object'
      return 'Unknown'
    default: return 'Unknown'
  }
}