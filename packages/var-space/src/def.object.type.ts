/**
 * Object type definition
 */

import { 
  VarDesc, 
  NativeType, 
  getDefaultValue, 
  BasicTypeMeta, 
  isPlainObject, 
  inferVarType 
} from "./def.basic.type";
import { strictConversionRules } from './def.conversion.rule'; // Import the rules
import { observable } from "mobx";

/**
 * Strict mode, performs strict type checking.
 */
let __strict__ =  false;

/**
 * Creates a copy of the type descriptor (solves shared reference issues).
 * @param type 
 * @returns 
 */
function createDescriptor(type: NativeType): VarDesc {
  const meta = BasicTypeMeta.get(type)
  if (!meta) throw new Error(`non-exist type: ${type}`)
  return { ...meta }
}

/**
 * 变量节点，proxy handler， 
 * - 用于隐藏结构直接访问变量
 */
const PROXY_HANDLER = {
  get(target: ObjectNode|RootVarObject, key: string) {
    switch (key) {
      // RootVarObject properties
      case 'key':
      case 'scope':
      case 'alias':
      case '$data':
      case 'build$data':
      case 'getStruct':
      case 'getWrappedData':
      case 'getVarNode':
      // ObjectNode (and inherited) properties/methods
      case '$setData':
      case 'getStructX':
      case '$appendLeafChild':
      case '$appendObjChild':
      case '$deleteVar':
      case '$hasVar':
      case '$varNodes':
      case '$isXObj':
      case 'descriptor':
      case 'getData':
      case '$backgroundData':
      // Internal/Helper properties
      case 'pNode':
        return target[key];
      default:
        // Forward value access to child nodes
        const node = target.$varNodes.get(key)
        if (!node) return undefined;
        
        if (node instanceof ObjectNode) {
          return node
        } else {
          return node.value
        }
    }
  },

  /**
   * Strictly controls variable modification.
   * - Leaf node variable values are modified through the parent node.
   * @param target
   * @param key
   * @param value
   * @returns
   */
  set(target: ObjectNode, key: string, value: any): boolean {
    // 1. Handle system keys
    switch (key) {
      case 'descriptor':
      case '$backgroundData':
      case 'key':
      case 'scope':
      case 'alias':
        target[key] = value
        return true

      case '$appendLeafChild':
      case '$appendObjChild':
      case '$deleteVar':
      case 'getStruct':
      case 'getStructX':
      case '$setData':
      case '$hasVar':
      case 'getVarNode':
      case 'getData':
      case 'build$data':
      case 'getWrappedData':
        console.warn(`System method ${key} cannot be modified`)
        return false
    }

    // 2. Check if target node exists
    const node = target.$varNodes.get(key);
    if (!node) {
      // If __strict__, creating variables on the fly might be disallowed.
      // For now, maintain original behavior: warn and fail if node doesn't exist.
      console.warn(`Property ${key} does not exist, cannot set value`);
      return false;
    }

    // 3. Check writable
    if (node.descriptor.writable === false) {
      console.warn(`Property ${key} is not writable`);
      return false;
    }

    // 4. Handle Assignment Logic
    const valueType = inferVarType(value);
    const originType = node.descriptor.type;

    // 4.1 Strict Mode: Disallow undefined assignment
    if (__strict__ && value === undefined) {
      console.error(`[Strict Mode] Property ${key} (${originType}) does not accept undefined value`);
      return false;
    }

    let finalValue = value;
    let assignmentAllowed = true;

    // 4.2 Type Matching or Conversion
    if (originType !== valueType && valueType !== 'Unknown') {
      if (__strict__) {
        // --- Strict Mode: Use the rule map ---
        const originRules = strictConversionRules.get(originType);
        const conversionFn = originRules?.get(valueType);

        if (conversionFn) {
          // Rule exists, attempt conversion/validation
          const result = conversionFn(value, key, originType);
          if (result.success) {
            finalValue = result.convertedValue;
          } else {
            // Conversion failed
            console.error(result.error || `[Strict Mode] Type conversion failed: ${key} (${originType}) <- ${valueType}`);
            assignmentAllowed = false;
          }
        } else {
          // No rule found for this combination: Disallowed in strict mode
          console.error(`[Strict Mode] Property ${key} (${originType}) does not accept value of type ${valueType}`);
          assignmentAllowed = false;
        }
        // --- End of Strict Mode Rule Map Logic ---

      } else {
         // --- Non-Strict Mode (Keep previous lenient behavior) ---
         if (originType === 'Boolean' && valueType === 'Number') {
            finalValue = value !== 0;
         } else if (originType === 'Number' && valueType === 'String') {
             const numValue = Number(value);
             if (isNaN(numValue)) {
                 console.error(`Property ${key} type conversion failed: Cannot convert string "${value}" to number`);
                 return false; // Keep original behavior: return false
             }
             finalValue = numValue;
         } else if (originType === 'String' && (valueType === 'Number' || valueType === 'Boolean')) {
             finalValue = String(value);
         } else {
             console.warn(`Property ${key} type mismatch (non-strict mode), originType: ${originType}, valueType: ${valueType}`);
             // Proceed with assignment despite warning (original behavior)
         }
         // --- End of Non-Strict Mode --- 
      }
    }

    // 5. Perform Assignment if allowed
    if (!assignmentAllowed) {
      return false; // Assignment failed strict check or non-strict conversion failure
    }

    // Handle assignment for Object nodes specifically
    if (node instanceof ObjectNode) {
       const objNode = node as ObjectNode; // We know node is ObjectNode here
       if (valueType === 'Object') {
           // Assign properties to children or background data
           // Use finalValue which should be the validated object in strict mode
           const valueToAssign = finalValue; 
           const backgroundData = { ...(objNode.$backgroundData || {}) }; // Preserve existing background data
           let childAssignmentFailed = false;

           Object.keys(valueToAssign).forEach(k => {
               if (objNode.$varNodes.has(k)) {
                   // Assign using the proxy setter for the child key 'k'
                   // This will trigger the 'set' handler recursively for the child
                   try {
                       // Directly trigger the proxy setter for the child property
                       objNode[k] = valueToAssign[k];
                       // Note: The above line might return true/false if the PROXY_HANDLER.set
                       // is modified to return the result. Currently it doesn't directly,
                       // so we rely on it logging errors if it fails internally.
                       // For a robust failure check, PROXY_HANDLER.set would need to return the actual success state.
                       // Assuming for now it logs error and we proceed unless we modify set to return reliably.
                   } catch (e) {
                       // Catch potential errors thrown by deeper sets (though current code uses console.error)
                       console.error(`Error setting property ${key}.${k} during object assignment:`, e);
                       childAssignmentFailed = true;
                   }
               } else {
                   // Add to background data if key doesn't exist on target node
                   backgroundData[k] = valueToAssign[k];
               }
           });

           objNode.$backgroundData = backgroundData;

           // Optionally, make parent assignment fail if any child failed
           // (Requires PROXY_HANDLER.set to reliably indicate failure, e.g., by throwing or returning false)
           if (childAssignmentFailed) {
               // console.error(`Object assignment for ${key} partially failed due to child errors.`);
               // return false; // Uncomment this to fail the parent assignment
           }

       } else {
           // Assigning a non-object to an Object node
           if (__strict__) {
               console.error(`[Strict Mode] Cannot assign non-object type ${valueType} to object property ${key}`); // Message kept for clarity
               return false;
           } else {
               console.warn(`Assigning non-object type ${valueType} to object property ${key}. This may lead to unexpected behavior.`);
               // Prevent this even in non-strict mode for clarity?
               return false; // Let's block this assignment always.
           }
       }
    } else {
        // Assign final (potentially converted) value to leaf node (PrimitiveVar)
        if (node.value !== finalValue) { // Avoid unnecessary updates
            node.value = finalValue;
        }
    }

    return true; // Assignment successful
  }
}

/**
 * Variable export structure
 * - Used for visual representation
 */
export type IVarStruct = {
  /** Variable key */
  key: string;
  /** Visual display name */
  label: string;
  /** Variable type */
  type: NativeType;
  /**
   * Writable
   */
  writeable: boolean;
  /**
   * Enumerable
   */
  enumerable: boolean;

  children?: IVarStruct[];
}

/**
 * Variable value update event
 */
type valueChangedEvent = {
  key: string
  path: string[]
  originalValue: any
  value: any
}

/**
 * Definition change event
 */
type definitionChangedEvent = {
  type: definitionChangedType
  definition: Record<string, any>
}

type valueChangedHandler = (e: valueChangedEvent) => void;
type definitionChangedType = 'add' | 'remove' | 'update';
type definitionChangedHandler = (e: definitionChangedEvent) => void;

// ==============================Above is the underlying capability of variables===================================

/**
 * A non-object node (Primitive/Leaf)
 */
type PrimitiveVar = {
  value: any
  descriptor: VarDesc
}

/**
 * An object node
 * - The value of an object node is derived from $varNodes, so it doesn't have its own 'value'
 */
export class ObjectNode {
  $isXObj: boolean = true;

  $varNodes: Map<string, PrimitiveVar|ObjectNode> = new Map();

  /**
   * Background data
   * - When setting data directly on an object node, data exceeding the defined structure falls here.
   * - Background data, once set, cannot be deleted.
   */
  $backgroundData: Record<string, PrimitiveVar> = {};

  descriptor: VarDesc = createDescriptor('Object'); 

  /**
   * Parent node
   * - Only used for path localization
   */
  pNode: any;

  [key: string]: any;

  /**
   * Bulk sets data, updating corresponding $varNodes.
   * - If a corresponding $varNode is not found, the value is set in $backgroundData.
   * - This method bypasses the 'writable' restriction and can force updates on read-only variables.
   * @param data The data object to set.
   */
  public $setData (data: object): void {
    if (!isPlainObject(data)) {
      console.warn('$setData only accepts plain objects as arguments');
      return;
    }

    const that = this;

    Object.entries(data).forEach(([key, value]) => {
      const node = that.$varNodes.get(key);
      
      if (node) {
        // Node exists, update the value directly
        if (node instanceof ObjectNode) {
          // If it's an object node and the value is also an object, set recursively
          if (isPlainObject(value)) {
            node.$setData(value);
          } else {
            console.warn(`Property ${key} is of type object, but the provided value is not an object`);
          }
        } else {
          // Leaf node, set value directly, ignoring writable restriction
          if (node.value !== value) {
            node.value = value;
          }
        }
      } else {
        // Node does not exist, set to background data
        if (!that.$backgroundData) {
          that.$backgroundData = {};
        }
        that.$backgroundData[key] = value;
      }
    });
  }

  /**
   * Appends a non-object type descendant variable (leaf node).
   * - Cannot be registered repeatedly.
   * @param key Key name
   * @param desc Variable descriptor (must contain 'type' or 'value' must be provided)
   * @param value Initial value (if provided, overrides the default value inferred from desc.type)
   * @returns [PrimitiveVar, update, dispose], returns the registered leaf variable, update method, and dispose method
   */
  $appendLeafChild(
    key: string, desc: Partial<VarDesc>, value?: any
  ): [PrimitiveVar, /** update */(newValue: any) => boolean, /** dispose */() => void] {
    // Check for duplicate registration
    if (this.$varNodes.has(key)) {
      console.warn(`Variable ${key} is already registered`);
      const existingNode = this.$varNodes.get(key);
      // Ensure it's not an ObjectNode being overwritten by a leaf
       if (existingNode instanceof ObjectNode) {
          const errorMsg = `Variable ${key} already exists as an object node and cannot be overwritten by a leaf node.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
       }
      // Return existing leaf node with its update and dispose (no-op dispose)
      const updateFn = (newValue: any): boolean => { 
        try { 
          this[key] = newValue; 
          return true; // Assume success, rely on proxy logs for errors
        } catch (e) { 
          console.error(`Update failed for ${key}:`, e);
          return false; 
        } 
      };
      return [existingNode as PrimitiveVar, updateFn, () => {}];
    }

    // Ensure type or value is provided
    if (!desc.type && value === undefined) {
      throw new Error(`Variable ${key} registration failed, at least type or value must be provided.`);
    }

    // Infer type if not provided
    const varType = desc.type || inferVarType(value);

    // Check if the type is 'Object' - this method is for leaves only
    if (varType === 'Object') {
        const errorMsg = `Attempting to add object type variable ${key} using $appendLeafChild. Please use $appendObjChild.`;
        console.error(errorMsg);
        throw new Error(`Type Error: $appendLeafChild cannot be used to add 'Object' type. Please use $appendObjChild.`);
    }

    // Get default value if value is not provided
    let finalValue = value;
    if (finalValue === undefined) {
      finalValue = getDefaultValue(varType);
    }

    // Create and set descriptor
    const finalDesc: VarDesc = { ...createDescriptor(varType), ...desc };

    // Create PrimitiveVar (leaf node)
    const xVar: PrimitiveVar = { value: finalValue, descriptor: finalDesc };

    // Add to map
    this.$varNodes.set(key, xVar);

    // Return the node and dispose function
    const updateFn = (newValue: any): boolean => { 
      try { 
        this[key] = newValue; 
        return true; // Assume success, rely on proxy logs for errors
      } catch (e) { 
        console.error(`Update failed for ${key}:`, e);
        return false; 
      } 
    };
    const disposeFn = () => { this.$deleteVar(key); };
    return [xVar, updateFn, disposeFn];
  }

  /**
   * Appends an object type descendant variable.
   * @param key Key name
   * @param descriptor Variable descriptor (optional)
   * @returns [ObjectNode, update, dispose], returns the registered object variable, update method, and dispose method
   */
  $appendObjChild(key: string, descriptor?: Partial<VarDesc>): [ObjectNode, /** update */(newData: object) => boolean, /** dispose */() => void] {
    // Check for duplicate registration
    if (this.$varNodes.has(key)) {
      console.warn(`Variable ${key} is already registered`);
      const existingNode = this.$varNodes.get(key);
      if (existingNode instanceof ObjectNode) {
          // Return existing object node
          const updateFn = (newData: object): boolean => { 
            try { 
              this[key] = newData; 
              return true; // Assume success, rely on proxy logs for errors
            } catch (e) { 
              console.error(`Update failed for ${key}:`, e);
              return false; 
            } 
          };
          const disposeFn = () => { this.$deleteVar(key); }; // Keep existing dispose logic for duplicates? Or no-op? Let's keep delete.
          return [existingNode, updateFn, disposeFn];
      } else {
          // Key exists but is not an object node
          const errorMsg = `Variable ${key} already exists as a leaf node and cannot be overwritten by an object node.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
      }
    }

    // Create and set descriptor
    const desc: VarDesc = { ...createDescriptor('Object'), ...(descriptor || {}) };

    // Create the ObjectNode
    const x = new ObjectNode();
    x.pNode = this;
    const xObj = new Proxy(x, PROXY_HANDLER);
    xObj.descriptor = desc; // Assign the combined descriptor

    // Add to map
    this.$varNodes.set(key, xObj);

    // Return the node and dispose function
    const updateFn = (newData: object): boolean => { 
      try { 
        this[key] = newData; 
        return true; // Assume success, rely on proxy logs for errors
      } catch (e) { 
        console.error(`Update failed for ${key}:`, e);
        return false; 
      } 
    };
    const disposeFn = () => { this.$deleteVar(key); };
    return [xObj, updateFn, disposeFn];
  }

  /**
   * Deletes a variable structure under this object.
   * - Does not delete its value in the data.
   * @param key 
   */
  $deleteVar(key: string) {
    this.$varNodes.delete(key)
  };

  $hasVar(key: string) {
    return this.$varNodes.has(key)
  }

  /**
   * Gets variable data.
   * @returns 
   */
  getData() {
    const data: Record<string, any> = {}
    this.$varNodes.forEach((node, key) => {
      if (node instanceof ObjectNode) {
        data[key] = node.getData()
      } else {
        data[key] = node.value
      }
    })
    // if (Object.keys(this.$backgroundData||[]).length > 0  ) {
    //   Object.assign({}, data, this.$backgroundData)
    // }
    return data
  }

  /**
   * Gets the definition structure of the variables.
   * - Used for visualizing the structure in low-code/no-code environments.
   * @returns Tree data of the variable structure.
   */
  getStructX(): IVarStruct[] {
    const result: IVarStruct[] = [];
    
    this.$varNodes.forEach((node, key) => {
      // Create basic structure
      const _struct: IVarStruct = {
        key,
        label: node.descriptor.label || key,
        type: node.descriptor.type,
        writeable: node.descriptor.writable !== false,
        enumerable: node.descriptor.enumerable !== false
      };
      
      // If it's an object node, recursively get the child structure
      if (node instanceof ObjectNode) {
        _struct.children = (node as ObjectNode).getStructX();
      }
      
      result.push(_struct);
    });
    
    // Sort by key name to ensure stable structure
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }
}


type IRootObject = {
  /**
   * The key for the variable space, must start with $
   */
  key: string;
  /**
   * Alias (must start with $)
   */
  alias?: string;
  /**
   * Display name of the node
   */
  label: string;
  /**
   * Whether the entire node tree is reactive.
   * - Defaults to false
   */
  observable?: boolean;

  enumerable?: boolean;

  writable?: boolean;
}

/**
 * Variable space level
 */
export type vsLevel = 'app' | 'page' | 'local';

/**
 * Root object node
 * - The structure of organizing variables as objects is actually a tree, requiring a root node to simplify control logic.
 */
export class RootVarObject extends ObjectNode {
  /**
   * Variable space name (must start with $)
   * - Example: $mainForm
   */
  key: string;

  /**
   * The scope in which the variable space is effective.
   */
  scope: vsLevel

  /**
   * Upstream object
   * - Weak reference implemented using WeakRef
   */
  $referrer: any;

  /**
   * Alias (must start with $)
   */
  alias: string;

  /**
   * Permanently immutable reference data provided by the variable space.
   * - Initialized upon entity creation, subsequent references cannot be modified.
   * - Uses mobx capability for deep observation.
   */
  $data: Record<string, any>;


  /**
   * Builds $data, modifications are disallowed afterward, only updates via path are allowed.
   */
  build$data(): void {
    // Initialize $data, modifications disallowed afterward, only updates via path allowed
    let ref_data = this.getData()
    if (this.descriptor.observable) {
      ref_data = observable.object(ref_data, {}, {deep: true})
    }
    
    Object.defineProperty(this, '$data', {
      enumerable: false,
      writable: false,
      configurable: false,
      value: ref_data
    })
  }

  /**
   * Bulk sets data.
   * - Setting on var space synchronizes to $data.
   * @param data The data object to set.
   */
  $setData(data: object): void {
    super.$setData(data)
    // If $data is already built
    if (this.$data) {
      // Recursively sync to $data, currently only supports two levels of synchronization
      Object.entries(data).forEach(([key, value]) => {
        if (this.$data[key] !== value) {
          this.$data[key] = value;
        }
      });
    }
  }

  constructor(data: IRootObject) {
    super()
    this.key = data.key
    this.descriptor.label = data.label
    if (data.alias) {
      this.alias = data.alias 
    }

    if (data.observable) {
      this.descriptor.observable = true
    }
    if(data.enumerable!==undefined) {
      this.descriptor.enumerable = data.enumerable
    }
    if (data.writable!==undefined) {
      this.descriptor.writable = data.writable
    }

    return new Proxy(this, PROXY_HANDLER) as RootVarObject
  }

  /**
   * [Currently unused] Gets the node definition corresponding to the variable.
   * - For security reasons, the returned node object is a dereferenced object.
   * ### Example
   * ```js
   * const node = AppVs.getVarNode('$ctx.userId')
   * ```
   * @param varString Variable string, e.g., $mainForm.name, must start with the current object's key
   */
  getVarNode(varString: string) {
    const path = varString.split('.')

    if (path.length === 0) {
      console.warn('varString is invalid')
      return null
    }

    const scopeKey = path.shift()
    if (scopeKey !== this.key && scopeKey !== this.alias) {
      console.warn(`${scopeKey} cannot be found in this scope.`)
      return null
    }

    let current: PrimitiveVar | ObjectNode = this
    
    // Traverse the path to get the node
    for (let i = 0; i < path.length; i++) {
      const key = path[i]
      if (!(current instanceof ObjectNode)) {
        console.warn(`Path ${path.slice(0, i).join('.')} is not an object node`)
        return null
      }
      
      const node = current.$varNodes.get(key)
      if (!node) {
        console.warn(`Path ${key} not found`)
        return null
      }
      
      current = node
    }
    
    // Return a deep copy of the node to avoid reference modification
    if (current instanceof ObjectNode) {
      return {
        type: 'Object',
        descriptor: { ...current.descriptor },
        children: current.getStructX()
      }
    } else {
      return {
        type: 'Leaf',
        descriptor: { ...current.descriptor },
        value: current.value
      }
    }
  }

  /**
   * var space includes itself.
   * @returns 
   */
  getStruct(): IVarStruct {
    return {
      key: this.key,
      label: this.descriptor.label || this.key,
      type: 'Object',
      writeable: this.descriptor.writable ?? true,
      enumerable: this.descriptor.enumerable ?? true,
      children: super.getStructX()
    } 
  }

  /**
   * Gets the variable data structure for expressions.
   * ```js
   * // example:
   * {
   *   [key]: data,
   *   [alias]: data
   * }
   * ```
   * - The data has tracking capabilities; any object construction behavior will break tracking.
   * @returns 
   */
  getWrappedData(): Record<string, any> {
    const rst = {
      [this.key]: this.$data
    }
    if (this.alias) {
      rst[this.alias] = this.$data
    }

    return rst
  }
}