# var-space

This library provides tools for defining and managing typed variable spaces, potentially for state management or data modeling, built upon MobX.

## Description

(Provide a more detailed description here. What problem does this library solve? What are its key features? e.g., "Manages complex, observable data structures with defined types and conversion rules.")

## Installation

```bash
npm install var-space mobx
# or
yarn add var-space mobx
```

## Core Concepts

*   **`RootVarObject`**: The main class or function to create and manage the root of your variable space or data structure.
*   **`VarDesc`**: A type used to describe the variables or properties within the `RootVarObject`.
*   **`configRule`**: A function or mechanism to configure conversion rules or other behaviors within the variable space.

## Basic Usage

```typescript
import { RootVarObject, configRule, VarDesc } from 'var-space';
import { makeAutoObservable } from 'mobx'; // Assuming usage with MobX

// Define your variable descriptions (replace with actual structure)
// const myVarDescriptions: VarDesc[] = [ ... ]; 

// Configure conversion rules if necessary
// configRule({ /* ... your rules ... */ });

// Create the main variable space instance
class MyStore {
  variables: RootVarObject; // Or the specific type returned

  constructor() {
    // Replace with the actual way to instantiate RootVarObject
    // this.variables = new RootVarObject(myVarDescriptions); 
    makeAutoObservable(this); // Make it observable with MobX
  }

  // Add methods to interact with the variables
  updateVariable(key: string, value: any) {
    // Example: Access or modify variables within RootVarObject
    // this.variables.set(key, value); 
  }
}

const store = new MyStore();

// Now you can use the 'store' instance, and changes might be observable
// depending on the implementation of RootVarObject and MobX integration.

console.log(store.variables); 
```

**(Please replace the example above with a working code snippet demonstrating the primary use case of your library)**

## API

### Exports

*   `RootVarObject`: Class or function to create the main data structure.
*   `configRule`: Function to configure library behavior (e.g., conversion rules).
*   `VarDesc`: Type definition for describing variables.

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

# Var-Space Custom Type System

The var-space package provides a flexible type system that allows you to define custom types with full TypeScript support. This document explains how to use the custom type system.

## Basic Usage

### Defining Custom Types

You can define custom types using the `defineCustomType` function with full TypeScript type safety:

```typescript
import { defineCustomType } from './custom.type.api';

// Define your type
type User = {
  id: string;
  age: number;
  address: string;
};

// Define the custom type
defineCustomType<User>({
  type: "User",
  defaultValue: {
    id: "",
    age: 0,
    address: ""
  }
});
```

### Retrieving Custom Types

When retrieving custom types, you get full type safety:

```typescript
import { getCustomType } from './custom.type.api';

const userType = getCustomType<User>("User");
if (userType) {
  // TypeScript knows this is a User type
  const newUser: User = userType.defaultValue;
  
  // Full type checking is available
  newUser.id = "123";  // OK
  newUser.age = 25;    // OK
  newUser.address = "123 Main St";  // OK
  // newUser.unknownField = "value";  // Error: Property 'unknownField' does not exist
}
```

## Advanced Features

### Custom Descriptors

You can provide custom descriptors for your types:

```typescript
defineCustomType<User>({
  type: "User",
  defaultValue: {
    id: "",
    age: 0,
    address: ""
  },
  descriptor: {
    type: "Object",
    writable: true,
    enumerable: true,
    observable: true,
    label: "User Profile",
    info: "User profile information"
  }
});
```

### Type Conversion Rules

You can define conversion rules for your custom types:

```typescript
defineCustomType<User>({
  type: "User",
  defaultValue: {
    id: "",
    age: 0,
    address: ""
  },
  conversionRules: new Map([
    ['String', (value) => ({ 
      success: typeof value === 'string',
      convertedValue: value,
      error: 'Invalid string value'
    })]
  ])
});
```

## Type Safety

The custom type system provides several safety features:

1. **Protected Native Types**: You cannot override native types like 'String', 'Number', 'Boolean', etc.
2. **Type Checking**: Full TypeScript type checking for your custom types
3. **Duplicate Prevention**: Each type can only be defined once
4. **Default Descriptors**: If no descriptor is provided, a default one is used

## API Reference

### defineCustomType<T>

Defines a new custom type with its metadata and conversion rules.

```typescript
function defineCustomType<T>(definition: CustomTypeDefinition<T>): void
```

Parameters:
- `definition`: Object containing:
  - `type`: string - The name of the custom type
  - `defaultValue`: T - The default value for this type
  - `descriptor?`: VarDesc - Optional variable descriptor
  - `conversionRules?`: Map<NativeType, ConversionFn> - Optional conversion rules

### getCustomType<T>

Retrieves a custom type definition with its generic type.

```typescript
function getCustomType<T = any>(type: string): CustomTypeDefinition<T> | undefined
```

Parameters:
- `type`: string - The name of the type to look up

Returns:
- The custom type definition if found, undefined otherwise

### isCustomType

Checks if a type is a custom type.

```typescript
function isCustomType(type: string): boolean
```

Parameters:
- `type`: string - The type name to check

Returns:
- true if the type is a custom type, false otherwise

### getCustomTypes

Gets all registered custom types.

```typescript
function getCustomTypes(): string[]
```

Returns:
- Array of custom type names

## Best Practices

1. Always provide meaningful default values that match your type structure
2. Use descriptive labels and info in descriptors for better documentation
3. Implement conversion rules when your type needs to interact with other types
4. Keep type names unique and descriptive
5. Leverage TypeScript's type system for better development experience

## Example Use Cases

### Complex Object Types

```typescript
type Product = {
  id: string;
  name: string;
  price: number;
  categories: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
};

defineCustomType<Product>({
  type: "Product",
  defaultValue: {
    id: "",
    name: "",
    price: 0,
    categories: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
});
```

### Enum-like Types

```typescript
type Status = "active" | "inactive" | "pending";

defineCustomType<Status>({
  type: "Status",
  defaultValue: "pending",
  descriptor: {
    type: "String",
    writable: true,
    enumerable: true
  }
});
```
