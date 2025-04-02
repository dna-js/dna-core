/**
 * how to define variable type
 * - native type define
 * - custom type define ability
 */

// Define ConversionResult and updated ConversionFn locally
export type ConversionResult = {
  success: boolean; // Was the conversion/validation successful?
  convertedValue?: any; // The value after conversion (if successful)
  error?: string; // Error message (if failed)
};
type ConversionFn = (value: any) => ConversionResult; // Updated signature

// Export NativeType
type NativeType = 'Object' | 'String' | 'Number' | 'Boolean' | 'DateTime' | 'Time' | 'Date' | "Unknown";

/**
 * basic descriptor of a variable
 */
// Export VarDescriptor
type VarDescriptor = {
  nativeType: NativeType
  writable?: boolean
  enumerable?: boolean
  configurable?: boolean
  observable?: boolean
}

/**
 * get the default descriptor of a type
 * @param type 
 * @returns 
 */
// Export getDefaultDescriptor
export function getDefaultDescriptor(type: NativeType): VarDescriptor {
  return {
    nativeType: type,
    writable: true,
    enumerable: true,
    configurable: true,
    observable: false
  }
}

/**
 * a variable instance
 */
type VarItemInstance<T=any> = {
  value: T
  varDescriptor: VarDescriptor
}

/**
 * use to define a variable type
 * - not a variable instance
 */
export class VarType<T> {
  type: string
  defaultValue: T
  defaultLabel: string
  defaultDescriptor: VarDescriptor

  /**
   * custom toString function
   * - when use the variable in expression, you may want to customize the logic
   */
  toString(value: T): string {
    return String(value)
  }

  /**
   * conversion rules
   */
  private conversionRules: Map<NativeType, ConversionFn> = new Map()

  constructor(props: Omit<Partial<VarType<T>>, 'type'> & { type: string }) {
    Object.assign(this, props)
  }

  /**
   * config conversion rule
   * - from native type to this[type]
   */
  configRule(fromType: NativeType, fn: ConversionFn) {
    this.conversionRules.set(fromType, fn)
  }

  /**
   * Get a specific conversion rule from a native type to this type.
   * @param fromType The native type to convert from.
   * @returns The conversion function if a rule exists, otherwise undefined.
   */
  getConversionRule(fromType: NativeType): ConversionFn | undefined {
    return this.conversionRules.get(fromType);
  }

  /**
   * create a variable based on this type settings
   */
  spawn(value?: T): VarItemInstance<T> {
    const instance = Object.create({
      value: this.defaultValue,
      varDescriptor: this.defaultDescriptor
    })

    if (value !== undefined) {
      instance.value = value
    }
    return instance
  }
}

// type registry place
const __TYPES__: Map<string, VarType<any>> = new Map()

// Export a getter for the type registry
export function getVarType<T = any>(type: string): VarType<T> | undefined {
  return __TYPES__.get(type);
}

// Export a function to get all defined type names
export function getAllVarTypes(): string[] {
  return Array.from(__TYPES__.keys());
}

// Export a function to clear the registry for testing
export function _clearVarTypeRegistryForTesting(): void {
  __TYPES__.forEach((value, key) => {
    const nativeTypes: NativeType[] = ['Object', 'String', 'Number', 'Boolean', 'DateTime', 'Time', 'Date', 'Unknown'];
    if (!nativeTypes.includes(key as NativeType)) {
      __TYPES__.delete(key);
    }
  });
}

/**
 * define a variable type
 * @param type 
 * @param options 
 * @returns 
 */
function defineVarType<T>(
  type: string,
  options?: {
    defaultValue?: T,
    defaultLabel?: string,
    toString?: (value: T) => string,
    defaultDescriptor?: VarDescriptor
  }
) {
  if (__TYPES__.has(type)) {
    throw new Error(`Variable type ${type} is already defined and cannot be redefined.`);
  }

  // Determine the descriptor
  const nativeTypes: NativeType[] = ['Object', 'String', 'Number', 'Boolean', 'DateTime', 'Time', 'Date', 'Unknown'];
  const inferredNativeType = nativeTypes.includes(type as NativeType) ? type as NativeType : 'Object';
  const defaultDescriptor = getDefaultDescriptor(inferredNativeType);
  
  let descriptor: VarDescriptor;
  if (options?.defaultDescriptor) {
    descriptor = { ...defaultDescriptor, ...options.defaultDescriptor };
  } else {
    descriptor = defaultDescriptor;
  }

  const varTypeOptions: any = { type, defaultDescriptor: descriptor };
  if (options?.defaultValue !== undefined) varTypeOptions.defaultValue = options.defaultValue;
  if (options?.defaultLabel !== undefined) varTypeOptions.defaultLabel = options.defaultLabel;
  if (options?.toString !== undefined) varTypeOptions.toString = options.toString;

  const varType = new VarType<T>(varTypeOptions);

  __TYPES__.set(type, varType);
  return varType;
}

// basic type define - Now defaultDescriptor is optional here if we want
const VarTypeObject = defineVarType<object>('Object', { defaultValue: {}});
// Object <- Object
VarTypeObject.configRule('Object', (value: object) => ({ success: true, convertedValue: value }));

const VarTypeString = defineVarType<string>('String', { defaultValue: ''});
// String <- Number
VarTypeString.configRule('Number', (value: number) => ({ success: true, convertedValue: String(value) }));
// String <- Boolean
VarTypeString.configRule('Boolean', (value: boolean) => ({ success: true, convertedValue: String(value) }));
// String <- Date (Using toISOString as per def.conversion.rule.ts)
VarTypeString.configRule('Date', (value: Date) => ({ success: true, convertedValue: value.toISOString() }));

const VarTypeNumber = defineVarType<number>('Number', { defaultValue: 0});
// Number <- String (Stricter checks from def.conversion.rule.ts)
VarTypeNumber.configRule('String', (value: string) => {
  const strValue = String(value).trim();
  if (strValue === '') {
    return { success: false, error: `Cannot convert empty string to Number` };
  }
  const numValue = Number(strValue);
  if (isNaN(numValue)) {
    return { success: false, error: `Cannot convert string "${value}" to a valid Number` };
  }
  return { success: true, convertedValue: numValue };
});
// Number <- Boolean
VarTypeNumber.configRule('Boolean', (value: boolean) => ({ success: true, convertedValue: value ? 1 : 0 }));
// Number <- Date
VarTypeNumber.configRule('Date', (value: Date) => ({ success: true, convertedValue: value.getTime() }));

const VarTypeBoolean = defineVarType<boolean>('Boolean', { defaultValue: false});
// Boolean <- Number
VarTypeBoolean.configRule('Number', (value: number) => ({ success: true, convertedValue: value !== 0 }));
// Boolean <- String (Stricter checks from def.conversion.rule.ts)
VarTypeBoolean.configRule('String', (value: string) => {
  const lower = String(value).trim().toLowerCase();
  if (lower === 'true') return { success: true, convertedValue: true };
  if (lower === 'false') return { success: true, convertedValue: false };
  return { success: false, error: `Cannot convert string "${value}" to Boolean (expects 'true' or 'false')` };
});


// These date/time types currently have nativeType: 'Number' specified in their descriptors.
// If we omit the descriptor, they would default to nativeType: 'Object' based on the logic above.
// So, we should keep specifying their descriptors explicitly if we want nativeType: 'Number'.
const t = new Date()
const VarTypeDateTime = defineVarType<number>('DateTime', { defaultValue: t.getTime(), defaultLabel: 'DateTime', defaultDescriptor: { nativeType: 'Number' } })
// DateTime <- String (Stricter checks from def.conversion.rule.ts Date logic)
VarTypeDateTime.configRule('String', (value: string) => {
  const strValue = String(value).trim();
  if (strValue === '') {
    return { success: false, error: `Cannot convert empty string to DateTime` };
  }
  const dateValue = new Date(strValue);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert string "${value}" to a valid DateTime` };
  }
  return { success: true, convertedValue: dateValue.getTime() }; // Return timestamp
});
// DateTime <- Number (Stricter checks from def.conversion.rule.ts Date logic)
VarTypeDateTime.configRule('Number', (value: number) => {
  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert number ${value} to a valid DateTime` };
  }
  return { success: true, convertedValue: dateValue.getTime() }; // Return timestamp
});

const VarTypeTime = defineVarType<number>('Time', { defaultValue: t.getTime(), defaultLabel: 'Time', defaultDescriptor: { nativeType: 'Number' } })
// Add rules similar to DateTime, returning timestamp
VarTypeTime.configRule('String', (value: string) => {
  const strValue = String(value).trim();
  if (strValue === '') {
    return { success: false, error: `Cannot convert empty string to Time` };
  }
  const dateValue = new Date(strValue);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert string "${value}" to a valid Time` };
  }
  return { success: true, convertedValue: dateValue.getTime() }; // Return timestamp
});
VarTypeTime.configRule('Number', (value: number) => {
  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert number ${value} to a valid Time` };
  }
  return { success: true, convertedValue: dateValue.getTime() }; // Return timestamp
});

const VarTypeDate = defineVarType<number>('Date', { defaultValue: t.getTime(), defaultLabel: 'Date', defaultDescriptor: { nativeType: 'Number' } })
// Add rules similar to DateTime, returning timestamp
VarTypeDate.configRule('String', (value: string) => {
  const strValue = String(value).trim();
  if (strValue === '') {
    return { success: false, error: `Cannot convert empty string to Date` };
  }
  const dateValue = new Date(strValue);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert string "${value}" to a valid Date` };
  }
  // Could potentially strip time part here, but returning timestamp for now
  return { success: true, convertedValue: dateValue.getTime() };
});
VarTypeDate.configRule('Number', (value: number) => {
  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    return { success: false, error: `Cannot convert number ${value} to a valid Date` };
  }
  // Could potentially strip time part here, but returning timestamp for now
  return { success: true, convertedValue: dateValue.getTime() };
});

function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]'
}


/**
 * Infer variable type based on value
 * - Numerical Date values will be inferred as Number type
 * @param val 
 * @returns 
 */
function inferVarType(val: any): NativeType {
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

export {
  defineVarType,
  VarTypeObject,
  VarTypeString,
  VarTypeNumber,
  VarTypeBoolean,
  VarTypeDateTime,
  VarTypeTime,
  VarTypeDate,
  inferVarType,
  isPlainObject
}

export type {
  VarDescriptor,
  VarItemInstance,
  ConversionFn,
  NativeType
}