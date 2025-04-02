import { configRule } from "./def.conversion.rule";
import { RootVarObject } from "./def.object.type";
import type { VarDesc } from "./def.basic.type";

export {
  configRule,
  RootVarObject
}

export type {
  VarDesc
}

export {
  defineCustomType,
  getCustomType,
  isCustomType,
  getCustomTypes
} from './custom.type.api';

export type {
  CustomTypeDefinition
} from './custom.type.api';