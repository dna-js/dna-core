import { 
  NativeType, 
  VarDesc, 
  getDefaultDescriptor, 
} from './def.basic.type';
import { configRule, ConversionFn } from './def.conversion.rule';

// Define the structure for a custom type with generic support
export type CustomTypeDefinition<T = any> = {
  type: string;
  defaultValue: T;
  descriptor?: VarDesc;
  conversionRules?: Map<NativeType, ConversionFn>;
};

// Store for custom types with their generic type information
const CustomTypeRegistry = new Map<string, CustomTypeDefinition<any>>();

// Native types that cannot be overridden
const PROTECTED_TYPES: NativeType[] = ['String', 'Number', 'Boolean', 'Object', 'Date', 'DateTime', 'Time'];

/**
 * Define a new custom type with its metadata and conversion rules
 * @param definition The custom type definition
 * @throws Error if trying to override a native type or if type name is invalid
 */
export function defineCustomType<T>(definition: CustomTypeDefinition<T>): void {
  // Validate type name
  if (!definition.type || typeof definition.type !== 'string') {
    throw new Error('Type name must be a non-empty string');
  }

  // Check if trying to override a native type
  if (PROTECTED_TYPES.includes(definition.type as NativeType)) {
    throw new Error(`Cannot override native type: ${definition.type}`);
  }

  // Check if type already exists
  if (CustomTypeRegistry.has(definition.type)) {
    throw new Error(`Type ${definition.type} is already defined`);
  }

  // Create a complete definition with default descriptor if not provided
  const completeDefinition: CustomTypeDefinition<T> = {
    ...definition,
    descriptor: definition.descriptor || getDefaultDescriptor('Object')
  };

  // Store the custom type definition
  CustomTypeRegistry.set(definition.type, completeDefinition);

  // Register conversion rules if provided
  if (definition.conversionRules) {
    definition.conversionRules.forEach((rule, fromType) => {
      configRule(definition.type as NativeType, fromType, rule);
    });
  }
}

/**
 * Get a custom type definition with its generic type
 * @param type The type name to look up
 * @returns The custom type definition if found, undefined otherwise
 */
export function getCustomType<T = any>(type: string): CustomTypeDefinition<T> | undefined {
  return CustomTypeRegistry.get(type) as CustomTypeDefinition<T> | undefined;
}

/**
 * Check if a type is a custom type
 * @param type The type name to check
 * @returns true if the type is a custom type, false otherwise
 */
export function isCustomType(type: string): boolean {
  return CustomTypeRegistry.has(type);
}

/**
 * Get all registered custom types
 * @returns Array of custom type names
 */
export function getCustomTypes(): string[] {
  return Array.from(CustomTypeRegistry.keys());
}
