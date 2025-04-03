/**
 * create var space
 * - with struct
 * - with data
 */

import {
  VarDescriptor,
  NativeType,
  VarItemInstance,
  getVarType,
  _clearVarTypeRegistryForTesting,
  inferVarType,
  ConversionFn,
  isPlainObject
} from "./var.type.define";

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
function createDescriptor(type: NativeType): VarDescriptor {
  const __VarType__ = getVarType(type)
  if (!__VarType__) throw new Error(`non-exist type: ${type}`)
  return { ...__VarType__.defaultDescriptor }
}

/**
 * 变量节点，proxy handler， 
 * - 用于隐藏结构直接访问变量
 */
const PROXY_HANDLER = {
  get(target: ObjectNode|VarSpace, key: string) {
    switch (key) {
      // RootVarObject properties
      case 'key':
      case 'scope':
      case 'alias':
      case '$data':
      case "$label":
      case 'build$data':
      case 'getStruct':
      case 'getVarNode':
      // ObjectNode (and inherited) properties/methods
      case 'getChildNode':
      case 'getChildInfo':  
      case '$setData':
      case 'getVsStruct':
      case '$appendLeaf':
      case '$appendNest':
      case '$deleteVar':
      case '$hasVar':
      case '$varNodes':
      case 'leaf':
      case 'varDescriptor':
      case 'getData':
      case 'getSymbolData':
      case '$backgroundData':
        return target[key];
      default:
        // Forward value access to child nodes
        const node = target.$varNodes.get(key)?.[0]
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
      case 'varDescriptor':
      case '$backgroundData':
      case 'key':
      case 'scope':
      case 'alias':
      case "$label":
        target[key] = value
        return true

      case '$appendLeaf':
      case '$appendNest':
      case '$deleteVar':
      case 'getStruct':
      case 'getVsStruct':
      case '$setData':
      case '$hasVar':
      case 'getVarNode':
      case 'getData':
      case 'build$data':
      case 'getSymbolData':
        console.warn(`System method ${key} cannot be modified`)
        return false
    }

    // 2. Check if target node exists
    const node = target.$varNodes.get(key)?.[0];
    if (!node) {
      console.warn(`Property ${key} does not exist, cannot set value`);
      return false;
    }

    // 3. Check writable
    if (node.varDescriptor.writable === false) {
      console.warn(`Property ${key} is not writable`);
      return false;
    }

    // 4. Handle Assignment Logic
    const from_type = inferVarType(value);
    const this_type = node.varDescriptor.nativeType;

    // 4.1 Strict Mode: Disallow undefined assignment
    if (__strict__ && value === undefined) {
      console.warn(`[Strict Mode] Property ${key} (${this_type}) does not accept undefined value`);
      return false;
    }

    let finalValue = value;
    let assignmentAllowed = true;

    // 4.2 Type Matching or Conversion
    if (this_type !== from_type && from_type !== 'Unknown') {
      if (__strict__) {
        // --- Strict Mode: Use the rule map ---
        // Get the VarType definition for the target type
        const thisVarType = getVarType(this_type);
        let conversionFn: ConversionFn | undefined = undefined;

        if (!thisVarType) {
          // This shouldn't happen if the node exists, but handle defensively
          console.error(`[Strict Mode] Internal Error: Cannot find VarType definition for type ${this_type}`);
          assignmentAllowed = false;
        } else {
          // Get the specific conversion rule using the public method
          conversionFn = thisVarType.getConversionRule(from_type);
        }
        
        if (assignmentAllowed && conversionFn) { // Check assignmentAllowed before proceeding
          // Rule exists, attempt conversion/validation
          // Update: Pass necessary context if ConversionFn signature requires it (assuming it's just (value) => result for now)
          const result = conversionFn(value); 
          if (result.success) {
            finalValue = result.convertedValue;
          } else {
            // Conversion failed
            console.error(result.error || `[Strict Mode] Type conversion failed: ${key} (${this_type}) <- ${from_type}`);
            assignmentAllowed = false;
          }
        } else {
          // No rule found for this combination: Disallowed in strict mode
          console.error(`[Strict Mode] Property ${key} (${this_type}) does not accept value of type ${from_type}`);
          assignmentAllowed = false;
        }
        // --- End of Strict Mode Rule Map Logic ---

      } else {
         // --- Non-Strict Mode (Keep previous lenient behavior) ---
         if (this_type === 'Boolean' && from_type === 'Number') {
            finalValue = value !== 0;
         } else if (this_type === 'Number' && from_type === 'String') {
             const numValue = Number(value);
             if (isNaN(numValue)) {
                 console.error(`Property ${key} type conversion failed: Cannot convert string "${value}" to number`);
                 return false; // Keep original behavior: return false
             }
             finalValue = numValue;
         } else if (this_type === 'String' && (from_type === 'Number' || from_type === 'Boolean')) {
             finalValue = String(value);
         } else {
             console.warn(`Property ${key} type mismatch (non-strict mode), this_type: ${this_type}, from_type: ${from_type}`);
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
       if (from_type === 'Object') {
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
               console.error(`[Strict Mode] Cannot assign non-object type ${from_type} to object property ${key}`); // Message kept for clarity
               return false;
           } else {
               console.warn(`Assigning non-object type ${from_type} to object property ${key}. This may lead to unexpected behavior.`);
               // Prevent this even in non-strict mode for clarity?
               return false; // Let's block this assignment always.
           }
       }
    } else {
        if (node.value !== finalValue) { 
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
  writable: boolean;
  /**
   * Enumerable
   */
  enumerable: boolean;

  children?: IVarStruct[];
  leaf?: boolean;
}

// ==============================Above is the underlying capability of variables===================================

/**
 * running info for var instance
 */
type InstanceInfo = {
  /** display label */
  label?: string,
  /** is leaf node */
  leaf?: boolean,
  [key: string]: any
}

/**
 * input props for var create
 */
type IVarMetaProps = {
  label?: string,
  value?: any,
} & VarDescriptor

/**
 * An object node
 */
export class ObjectNode {
  leaf: boolean = false;

  /**
   * key -> [varInstance, info]
   */
  $varNodes: Map<string, [VarItemInstance|ObjectNode, InstanceInfo]> = new Map();

  protected getChildNode(key: string) {
    return this.$varNodes.get(key)?.[0]
  }

  protected getChildInfo(key: string) {
    return this.$varNodes.get(key)?.[1]
  }

  /**
   * Background data
   * - When setting data directly on an object node, data exceeding the defined structure falls here.
   * - Background data, once set, cannot be deleted.
   */
  $backgroundData: Record<string, any> = {};

  varDescriptor: VarDescriptor = createDescriptor('Object'); 


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
      const node = that.getChildNode(key);
      
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
   * Appends leaf node.
   * - which can not hold child
   * @param key Key name
   * @param options Variable descriptor (must contain 'type' or 'value' must be provided)
   * @returns [VarItemInstance, update, dispose], returns the registered leaf variable, update method, and dispose method
   */
  $appendLeaf(
    key: string, options: IVarMetaProps
  ): [VarItemInstance, /** update */(newValue: any) => boolean, /** dispose */() => void] {

    const { value, label, ...__descriptor} = options;

    // Check for duplicate registration
    if (this.$varNodes.has(key)) {
      console.warn(`Variable ${key} is already registered`);
      const existingNode = this.getChildNode(key);
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
      return [existingNode as VarItemInstance, updateFn, () => {}];
    }

    // Ensure type or value is provided
    if (!options.nativeType && value === undefined) {
      throw new Error(`Variable ${key} registration failed, at least type or value must be provided.`);
    }

    const varType = options.nativeType || inferVarType(value);

    // Check if the inferred type is valid
    const varTypeDef = getVarType(varType);
    if (!varTypeDef) {
      throw new Error(`Variable ${key} registration failed, invalid or unregistered type: ${varType}.`);
    }

    // Get default value if value is not provided
    let finalValue = value;
    if (finalValue === undefined) {
      finalValue = varTypeDef.defaultValue;
    }

    // Create and set descriptor
    
    const finalDesc: VarDescriptor = { ...createDescriptor(varType), ...__descriptor };

    // Create VarItemInstance (leaf node)
    const xVar: VarItemInstance = { value: finalValue, varDescriptor: finalDesc };

    this.$varNodes.set(key, [xVar, {label: label || key, leaf: true}]);

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
   * Appends nest node.
   * - which can hold child variables
   * @param key Key name
   * @param options Configuration options including label and descriptor properties.
   * @returns [ObjectNode, update, dispose], returns the registered object variable, update method, and dispose method
   */
  $appendNest(
    key: string, options: IVarMetaProps
  ): [ObjectNode, /** update */(newData: object) => boolean, /** dispose */() => void] {
    // Check for duplicate registration
    if (this.$varNodes.has(key)) {
      console.warn(`Variable ${key} is already registered`);
      const existingNode = this.getChildNode(key);
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

    // Extract label and descriptor properties from options
    const { label, ...descriptorProps } = options || {};

    // Create and set descriptor
    const finalDesc: VarDescriptor = { 
      ...createDescriptor('Object'), // Start with Object defaults
      ...descriptorProps // Apply provided descriptor props
    };

    // Create the ObjectNode
    const x = new ObjectNode();
    const xObj = new Proxy(x, PROXY_HANDLER);
    xObj.varDescriptor = finalDesc; // Assign the combined descriptor

    // Create InstanceInfo
    const xInfo: InstanceInfo = { 
      label: label || key,
      leaf: false // It's a nest node
    };

    // Add to map
    this.$varNodes.set(key, [xObj, xInfo]);

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
      if (node[0] instanceof ObjectNode) {
        data[key] = node[0].getData()
      } else {
        if (node[0].varDescriptor.observable) {
          data[key] = observable(node[0].value);
        } else {
          data[key] = node[0].value;
        }
      }
    })

    // merge background data
    if (Object.keys(this.$backgroundData||[]).length > 0  ) {
      Object.assign(data, this.$backgroundData)
    }
    
    return data
  }

  /**
   * Gets the definition structure of the variables.
   * - Used for visualizing the structure in low-code/no-code environments.
   * @returns Tree data of the variable structure.
   */
  getStruct(): IVarStruct[] {
    const result: IVarStruct[] = [];
    
    this.$varNodes.forEach((node, key) => {
      const varObject = node[0];
      // Create basic structure
      const _struct: IVarStruct = {
        key,
        label: node[1].label || key,
        type: varObject.varDescriptor.nativeType,
        writable: varObject.varDescriptor.writable !== false,
        enumerable: varObject.varDescriptor.enumerable !== false,
        leaf: varObject instanceof ObjectNode ? false : true
      };
      
      // If it's an object node, recursively get the child structure
      if (varObject instanceof ObjectNode) {
        _struct.children = (varObject as ObjectNode).getStruct();
      }
      
      result.push(_struct);
    });
    
    // Sort by key name to ensure stable structure
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }
}


export type IVarSpace = {
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
export class VarSpace extends ObjectNode {
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
   * Alias (must start with $)
   */
  alias: string;

  $label: string;

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
    if (this.varDescriptor.observable) {
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

  constructor(data: IVarSpace) {
    super()
    if (!data.key.startsWith('$')) {
      throw new Error(`Key must start with "$": ${data.key}`);
    }
    this.key = data.key
    // label directly exist on varspace
    this.$label = data.label || data.key
    if (data.alias) {
      if (!data.alias.startsWith('$')) {
        throw new Error(`Alias must start with "$": ${data.alias}`);
      }
      this.alias = data.alias 
    }

    if (data.observable) {
      this.varDescriptor.observable = true
    }
    if(data.enumerable!==undefined) {
      this.varDescriptor.enumerable = data.enumerable
    }
    if (data.writable!==undefined) {
      this.varDescriptor.writable = data.writable
    }

    return new Proxy(this, PROXY_HANDLER) as VarSpace
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

    let current: VarItemInstance | ObjectNode = this
    
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
      
      current = node[0]
    }
    
    // Return a deep copy of the node to avoid reference modification
    if (current instanceof ObjectNode) {
      return {
        type: 'Object',
        varDescriptor: { ...current.varDescriptor },
        children: current.getStruct()
      }
    } else {
      return {
        type: 'Leaf',
        varDescriptor: { ...current.varDescriptor },
        value: current.value
      }
    }
  }

  /**
   * Gets the definition structure of the variable space.
   * - Used for visualizing the structure in low-code/no-code environments.
   * @returns An array containing the tree data structure of this variable space.
   */
  getVsStruct(): IVarStruct {
    const selfStruct: IVarStruct = {
      key: this.key,
      label: this.$label || this.key,
      type: 'Object', // VarSpace is always an Object type
      writable: this.varDescriptor.writable !== false, 
      enumerable: this.varDescriptor.enumerable !== false,
      leaf: false, // VarSpace is not a leaf
      children: super.getStruct() // Get children using ObjectNode's getStruct
    };
    return selfStruct;
  }

  /**
   * get symbolical data
   * - for expression usage
   * @returns 
   */
  getSymbolData(): Record<string, any> {
    const rst = {
      [this.key]: this.$data
    }
    if (this.alias) {
      rst[this.alias] = this.$data
    }

    return rst
  }
}