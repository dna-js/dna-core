/**
 * 转换规则定义
 */

import { NativeType } from "./def.basic.type";

// Define the structure for the conversion result
export type ConversionResult = {
  success: boolean; // Was the conversion/validation successful?
  convertedValue?: any; // The value after conversion (if successful)
  error?: string; // Error message (if failed)
};

// Define the type for a conversion function
export type ConversionFn = (value: any, key: string, targetType: NativeType) => ConversionResult;

// Define the main rules map: OriginType -> ValueType -> ConversionFunction
export const strictConversionRules: Map<NativeType, Map<NativeType, ConversionFn>> = new Map();

/**
 * config a conversion rule
 * - when assign as `originType = valueType`, the fn will be called to convert and check
 * @param originType 
 * @param valueType 
 * @param fn 
 */
function configRule(originType: NativeType, valueType: NativeType, fn: ConversionFn) {
  if (!strictConversionRules.has(originType)) {
    strictConversionRules.set(originType, new Map());
  }
  strictConversionRules.get(originType)!.set(valueType, fn);
}

// --- Populate Rules (based on the image's strict mode) ---

// Rules for assigning to String
configRule('String', 'Number', (value) => ({ success: true, convertedValue: String(value) }));
configRule('String', 'Boolean', (value) => ({ success: true, convertedValue: String(value) }));
configRule('String', 'Date', (value) => ({ success: true, convertedValue: (value as Date).toISOString() }));
// Other types (Object, Array - if added) are implicitly disallowed for String target

// Rules for assigning to Number
configRule('Number', 'String', (value, key, targetType) => {
  const strValue = String(value).trim();
  if (strValue === '') {
     return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 不接受空字符串` };
  }
  const numValue = Number(strValue);
  if (isNaN(numValue)) {
    return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 无法将字符串 "${value}" 转换为有效数字` };
  }
  return { success: true, convertedValue: numValue };
});
configRule('Number', 'Boolean', (value) => ({ success: true, convertedValue: value ? 1 : 0 }));
configRule('Number', 'Date', (value) => ({ success: true, convertedValue: (value as Date).getTime() }));
// Other types (Object, Array) are implicitly disallowed for Number target

// Rules for assigning to Boolean
configRule('Boolean', 'Number', (value) => ({ success: true, convertedValue: value !== 0 }));
configRule('Boolean', 'String', (value, key, targetType) => {
  const lower = String(value).trim().toLowerCase();
  if (lower === 'true') return { success: true, convertedValue: true };
  if (lower === 'false') return { success: true, convertedValue: false };
  return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 无法将字符串 "${value}" 转换为布尔值 (只接受 'true' 或 'false')` };
});
// Other types (Date, Object, Array) are implicitly disallowed for Boolean target

// Rules for assigning to Date
configRule('Date', 'Number', (value, key, targetType) => {
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
        return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 无法将数字 ${value} 转换为有效日期` };
    }
    return { success: true, convertedValue: dateValue };
});
configRule('Date', 'String', (value, key, targetType) => {
    const strValue = String(value).trim();
    if (strValue === '') {
         return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 不接受空字符串` };
    }
    const dateValue = new Date(strValue);
    if (isNaN(dateValue.getTime())) {
         return { success: false, error: `[Strict Mode] 属性 ${key} (${targetType}) 无法将字符串 "${value}" 转换为有效日期` };
    }
    return { success: true, convertedValue: dateValue };
});
// Other types (Boolean, Object, Array) are implicitly disallowed for Date target

// Rules for assigning to Object
configRule('Object', 'Object', (value) => ({ success: true, convertedValue: value })); // Only allow Object to Object
// Other types are implicitly disallowed for Object target

// --- End of Rules Definition --- 

export {
  configRule
}