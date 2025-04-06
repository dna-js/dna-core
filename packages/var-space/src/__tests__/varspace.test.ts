import {
  VarSpace,
  ObjectNode, // Import ObjectNode if needed for type checks or methods
  defineVarType, // Still needed to ensure types are defined if cleared
  getVarType,
  NativeType,
  VarDescriptor,
  VarItemInstance, // Import for type checking if needed
  _clearVarTypeRegistryForTesting,
  // Removed createVarSpace, setStrict, getVar, setVar
} from '../index';

// Helper function to get the actual node instance (VarItemInstance or ObjectNode)
// Traverses using the internal $varNodes map.
function getNodeFromParent(parentNode: any, relativePath: string): VarItemInstance | ObjectNode | undefined {
  if (!parentNode || typeof parentNode !== 'object' || !parentNode.$varNodes) {
      console.error("getNodeFromParent: Invalid parent node provided.", parentNode);
      return undefined;
  }
  const segments = relativePath.split('.');
  const leafKey = segments.pop()!;
  let currentParent = parentNode;

  // Traverse intermediate paths within the relative path
  for (const segment of segments) {
    if (!currentParent || !currentParent.$varNodes) {
        console.error(`getNodeFromParent: Invalid node encountered at segment '${segment}' in path '${relativePath}'`);
        return undefined;
    }
    const childInfo = currentParent.$varNodes.get(segment);
    currentParent = childInfo ? childInfo[0] : undefined;
    // Ensure the intermediate node is an ObjectNode
    if (!currentParent || !currentParent.$isXObj) {
        console.error(`getNodeFromParent: Node at segment '${segment}' is not an ObjectNode.`);
        return undefined;
    }
  }

  // Now get the final node from the correct parent
  if (!currentParent || !currentParent.$varNodes) {
      console.error(`getNodeFromParent: Could not find final parent node for path '${relativePath}'`);
      return undefined;
  }
  const nodeInfo = currentParent.$varNodes.get(leafKey);
  return nodeInfo ? nodeInfo[0] : undefined;
}

// Type definition for the schema structure used in tests
type TestSchemaDefinition = {
    type?: NativeType;
    label?: string;
    descriptor?: Partial<VarDescriptor>;
    [key: string]: any; // Allows for nested definitions
};

type TestSchema = Record<string, TestSchemaDefinition>;

describe('VarSpace Functionality', () => {
  let vs: VarSpace;
  const vsKey = '$testVs';

  const testSchema: TestSchema = {
    user: {
      name: { type: 'String', label: 'User Name', descriptor: { writable: true } },
      id: { type: 'Number', label: 'User ID', descriptor: { writable: false } },
      isActive: { type: 'Boolean', label: 'Active Status' },
      profile: {
        email: { type: 'String', label: 'Email Address' },
        lastLogin: { type: 'DateTime', label: 'Last Login Time', descriptor: { observable: true } }
      }
    },
    config: {
      theme: { type: 'String', label: 'UI Theme', descriptor: { enumerable: false } },
      timeout: { type: 'Number', label: 'Request Timeout' }
    },
    simpleValue: { type: 'String', label: 'Simple Top Level Value' }
  };

  const testData = {
    user: {
      name: 'Alice',
      id: 12345,
      isActive: true,
      profile: {
        email: 'alice@example.com',
        lastLogin: Date.now()
      }
    },
    config: {
      theme: 'dark',
      timeout: 5000
    },
    simpleValue: 'Hello World'
  };

  // Utility to build VarSpace structure from schema
  function buildStructure(targetNode: ObjectNode | VarSpace, schema: Record<string, TestSchemaDefinition>) {
      Object.entries(schema).forEach(([key, definition]) => {
          const { type, label, descriptor, ...nestedSchema } = definition;

          if (type) { // Leaf node definition
              const leafOptions: any = { nativeType: type, label };
              if (descriptor) {
                  Object.assign(leafOptions, descriptor);
              }
              targetNode.$appendLeaf(key, leafOptions);
          } else { // Nested object definition
              const nestOptions = { label, descriptor };
              // Cast to any to bypass strict type check, as $appendNest handles ObjectNodes
              const nestedNodeTuple = targetNode.$appendNest(key, nestOptions as any);
              buildStructure(nestedNodeTuple[0], nestedSchema);
          }
      });
  }

  beforeEach(() => {
    _clearVarTypeRegistryForTesting();
    // Recreate VarSpace instance
    vs = new VarSpace({ key: vsKey, label: 'Test Space' });
    // Build structure from the defined schema
    buildStructure(vs, testSchema);
    // Set initial data using $setData
    vs.$setData(testData);
  });

  it('should create a VarSpace instance with nested structure and initial data', () => {
    expect(vs.simpleValue).toBe('Hello World');
    expect(vs.user).toBeDefined();
    expect(vs.config).toBeDefined();
    expect(vs.user.name).toBe('Alice');
    expect(vs.user.id).toBe(12345);
    expect(vs.user.isActive).toBe(true);
    expect(vs.user.profile.email).toBe('alice@example.com');
    expect(typeof vs.user.profile.lastLogin).toBe('number');
    expect(vs.config.theme).toBe('dark');
    expect(vs.config.timeout).toBe(5000);
    expect(vs.nonExistent).toBeUndefined();
    expect(vs.user.nonExistent).toBeUndefined();
  });

  it('should respect variable descriptors (writable, enumerable, observable)', () => {
    const originalId = vs.user.id;
    console.warn = jest.fn();
    try { vs.user.id = 999; } catch (e) { /* Proxy set shouldn't throw */ }
    expect(vs.user.id).toBe(originalId);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not writable'));
    (console.warn as jest.Mock).mockRestore();

    vs.user.name = 'Bob';
    expect(vs.user.name).toBe('Bob');

    const configStruct = vs.config.getStruct();
    const themeStruct = configStruct.find(item => item.key === 'theme');
    const timeoutStruct = configStruct.find(item => item.key === 'timeout');
    expect(themeStruct?.enumerable).toBe(false);
    expect(timeoutStruct?.enumerable).toBe(true);
  });

  it('should allow getting and setting values using proxy access', () => {
     expect(vs.user.profile.email).toBe('alice@example.com');
     expect(vs.simpleValue).toBe('Hello World');

     const newTime = Date.now() + 1000;
     vs.user.profile.lastLogin = newTime;
     expect(vs.user.profile.lastLogin).toBe(newTime);

     vs.config.timeout = 10000;
     expect(vs.config.timeout).toBe(10000);

     vs.simpleValue = 'New Value';
     expect(vs.simpleValue).toBe('New Value');

     const newProfileData = { email: 'bob@example.com', lastLogin: Date.now() + 2000 };
     vs.user.profile = newProfileData;
     expect(vs.user.profile.email).toBe('bob@example.com');
     expect(vs.user.profile.lastLogin).toBe(newProfileData.lastLogin);
     expect(vs.user.name).toBe('Alice');
  });

  it('should handle type conversions based on defined rules (proxy set)', () => {
    vs.user.name = 12345;
    expect(vs.user.name).toBe('12345');
    vs.user.isActive = 1;
    expect(vs.user.isActive).toBe(true);
    vs.user.isActive = 0;
    expect(vs.user.isActive).toBe(false);
    vs.config.timeout = '3000';
    expect(vs.config.timeout).toBe(3000);

    console.error = jest.fn();
    const originalTimeout = vs.config.timeout;
    // Wrap in try-catch because returning false from proxy set trap in strict mode throws TypeError
    try { vs.config.timeout = 'not-a-number'; } catch (e) {
      // Expected potential TypeError, proceed to check outcome
    }
    expect(vs.config.timeout).toBe(originalTimeout);
    // Check for the specific console error message from var.creator.ts
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Cannot convert string "not-a-number" to a valid Number'));

    const originalActive = vs.user.isActive;
    // // Wrap in try-catch 
    try { vs.user.isActive = 'not-a-boolean'; } catch (e) {
      // Expected potential TypeError, proceed to check outcome
    }
    expect(vs.user.isActive).toBe(originalActive);
    // Check for the specific console error message (Update if message changed in var.creator.ts)
    // Assuming a conversion error is logged for DateTime
    // Example: expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Cannot convert ... to DateTime'));

    const originalLogin = vs.user.profile.lastLogin;
    // Wrap in try-catch
    try { vs.user.profile.lastLogin = 'invalid-date-string'; } catch (e) {
      // Expected potential TypeError, proceed to check outcome
    }
    expect(vs.user.profile.lastLogin).toBe(originalLogin);
    // Check for the specific console error message (Update if message changed in var.creator.ts)
    // Assuming a conversion error is logged for DateTime
    // Example: expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Cannot convert ... to DateTime'));

    (console.error as jest.Mock).mockRestore();
  });

   it('should allow accessing the underlying node instance details via helper', () => {
      const userNodeProxy = vs.user;

      const nameNode = getNodeFromParent(userNodeProxy, 'name') as VarItemInstance;
      expect(nameNode).toBeDefined();
      expect(nameNode.value).toBe('Alice');
      expect(nameNode.varDescriptor.nativeType).toBe('String');
      expect(nameNode.varDescriptor.writable).toBe(true);

      const idNode = getNodeFromParent(userNodeProxy, 'id') as VarItemInstance;
      expect(idNode).toBeDefined();
      expect(idNode.varDescriptor.writable).toBe(false);

      const profileNode = getNodeFromParent(userNodeProxy, 'profile') as ObjectNode;
      expect(profileNode).toBeDefined();
      expect(profileNode.isLeaf).toBe(false);
      expect(profileNode.varDescriptor.nativeType).toBe('Object');

      const lastLoginNodeInstance = getNodeFromParent(profileNode, 'lastLogin') as VarItemInstance;
      expect(lastLoginNodeInstance).toBeDefined();
      expect(lastLoginNodeInstance.varDescriptor.observable).toBe(true);
      expect(lastLoginNodeInstance.varDescriptor.nativeType).toBe('DateTime');
   });
});
