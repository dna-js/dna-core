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
