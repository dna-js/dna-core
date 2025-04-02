// Type definition exports from var.type.define.ts
export type {
  ConversionResult,
  VarDescriptor,
  VarItemInstance,
  ConversionFn,
  NativeType,
} from "./var.type.define";

// Type definition exports from var.creator.ts
export type {
  IVarStruct,
  IVarSpace,
  vsLevel,
} from "./var.creator";

// Value exports (functions, classes, constants) from var.type.define.ts
export {
  getDefaultDescriptor,
  VarType, // Class
  getVarType,
  getAllVarTypes,
  _clearVarTypeRegistryForTesting,
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
} from "./var.type.define";

// Value exports (classes) from var.creator.ts
export {
  ObjectNode, 
  VarSpace   
} from "./var.creator";