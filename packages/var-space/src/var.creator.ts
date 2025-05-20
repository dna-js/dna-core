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

import { observable, action, intercept, isObservableObject, extendObservable } from "mobx";

import { set_hidden_object, get_hidden_object, delete_hidden_object } from "./help"

/**
 * Strict mode, performs strict type checking.
 */
let __strict__ = true;

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
 * Validates writability and performs type conversion if necessary.
 * @param targetNode The node being assigned to.
 * @param value The incoming value.
 * @param key The key/path segment for logging.
 * @returns Result object indicating success, the final value, and any error.
 */
function validateAndConvertValue(
  targetNode: VarItemInstance | ObjectNode,
  value: any,
  key: string
): { success: boolean; finalValue?: any; error?: string } {
  // 1. Check writable
  if (targetNode.varDescriptor.writable === false) {
    const error = `Property ${key} is not writable`;
    console.warn(error);
    return { success: false, error };
  }

  // 2. Handle Assignment Logic (Type Matching/Conversion)
  const from_type = inferVarType(value);
  const this_type = targetNode.varDescriptor.nativeType;

  // 2.1 Strict Mode: Disallow undefined assignment (unless target is ObjectNode, handled later)
  if (
    __strict__ &&
    value === undefined &&
    !(targetNode instanceof ObjectNode)
  ) {
    const error = `[Strict Mode] Property ${key} (${this_type}) does not accept undefined value`;
    console.warn(error);
    return { success: false, error };
  }

  let finalValue = value;
  let conversionError: string | undefined = undefined;

  // 2.2 Type Matching or Conversion Needed?
  // Skip detailed checks if target is Object and value is Object (proxy setter handles recursion)
  if (
    !(targetNode instanceof ObjectNode && from_type === 'Object') &&
    this_type !== from_type &&
    from_type !== 'Unknown'
  ) {
    const thisVarType = getVarType(this_type);
    let conversionFn: ConversionFn | undefined = undefined;

    if (!thisVarType) {
      conversionError = `[Strict Mode] Internal Error: Cannot find VarType definition for type ${this_type}`;
    } else {
      conversionFn = thisVarType.getConversionRule(from_type);
    }

    if (!conversionError && conversionFn) {
      const result = conversionFn(value);
      if (result.success) {
        finalValue = result.convertedValue;
      } else {
        conversionError =
          result.error ||
          `[Strict Mode] Type conversion failed: ${key} (${this_type}) <- ${from_type}`;
      }
    } else if (!conversionError) {
      conversionError = `[Strict Mode] Property ${key} (${this_type}) does not accept value of type ${from_type}`;
    }
  }

  // 3. Final Check for Object Node Assignment Type Mismatch
  if (
    targetNode instanceof ObjectNode &&
    from_type !== 'Object' &&
    value !== undefined
  ) {
    conversionError = `Cannot assign non-object type ${from_type} to object property ${key}`;
  }


  if (conversionError) {
    console.error(conversionError);
    return { success: false, error: conversionError };
  }

  return { success: true, finalValue };
}

/**
 * 变量节点，proxy handler， 
 * - 用于隐藏结构直接访问变量
 */
const PROXY_HANDLER = {
  get(target: ObjectNode | VarSpace, key: string) { // Allow symbol keys
    // Handle known properties (existing switch cases)
    switch (key) {
      // RootVarObject properties
      case 'key':
      case 'scope':
      case 'alias':
      case '__$dataHost':
      case "$label":
      case '$buildHost':
      case 'getStruct':
      case 'getNodeByPath':
      case 'setValueByPath':
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
      case 'isLeaf':
      case 'varDescriptor':
      case 'getData':
      case 'getSymbolData':
      case '$backgroundData':
        const prop = target[key];
        if (typeof prop === 'function') {
          return prop.bind(target);
        }
        return prop;
      // for internal use
      case '__$dangerousInstance':
        return target;
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
      case 'getNodeByPath':
      case 'setValueByPath':
      case 'getData':
      case '$buildHost':
      case 'getSymbolData':
        console.warn(`System method ${key} cannot be modified`)
        return false
    }

    // 2. Check if target node exists
    const node = target.$varNodes.get(key)?.[0];
    if (!node) {
      console.warn(`Property ${key} does not exist, cannot set value (proxy setter)`);
      return false;
    }

    // 3. Use helper for validation, writability check, and conversion
    const validationResult = validateAndConvertValue(node, value, key);

    if (!validationResult.success) {
      // Helper already logged the error
      return false;
    }

    const finalValue = validationResult.finalValue;

    // 4. Perform Assignment with validated/converted value
    if (node instanceof ObjectNode) {
      // Handle object assignment (recursive via proxy)
      const objNode = node as ObjectNode;
      const from_type = inferVarType(finalValue); // Check type of finalValue

      // Need to ensure we are setting an object here after potential conversion
      // validateAndConvertValue already prevents assigning non-objects to ObjectNode
      if (from_type === 'Object') {
        const valueToAssign = finalValue;
        const backgroundData = { ...(objNode.$backgroundData || {}) };

        Object.keys(valueToAssign).forEach(k => {
          if (objNode.$varNodes.has(k)) {
            objNode[k] = valueToAssign[k];
          } else {
            backgroundData[k] = valueToAssign[k];
          }
        });

        objNode.$backgroundData = backgroundData;

      } else {
        // This case should technically be unreachable due to validateAndConvertValue,
        // but keep a safeguard.
        console.error(`Internal Error: Attempted to assign non-object to ObjectNode ${key} after validation.`);
        return false;
      }
    } else {
      // Leaf node assignment
      // Check if value actually changed before assignment
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
  isLeaf?: boolean;
  [key: string]: any;
}

// ==============================Above is the underlying capability of variables===================================

/**
 * running info for var instance
 */
type InstanceInfo = {
  /** display label */
  label?: string,
  /** is leaf node */
  isLeaf?: boolean,
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
  isLeaf: boolean = false;

  /**
   * key -> [varInstance, info]
   */
  $varNodes: Map<string, [VarItemInstance | ObjectNode, InstanceInfo]> = new Map();

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
  public $setData(data: object): void {
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
        if (!that.$backgroundData) {
          console.error('[var-space]: backgroundData is not set, cannot set value.(this logic should not happen)')
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
   * @param extraInfo Optional object to merge into the instance info.
   * @returns [VarItemInstance, update, dispose], returns the registered leaf variable, update method, and dispose method
   */
  $appendLeaf(
    key: string, options: IVarMetaProps,
    extraInfo?: Record<string, any>
  ): [VarItemInstance, /** update */(newValue: any) => boolean, /** dispose */() => void] {

    const { value, label, ...__descriptor } = options;

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
      // Get hidden object info for existing node (might be undefined if not previously set)
      const existingHidden = get_hidden_object(existingNode as VarItemInstance);
      const updateFn = (newValue: any): boolean => {
        try {
          this[key] = newValue;
          return true; // Assume success, rely on proxy logs for errors
        } catch (e) {
          console.error(`Update failed for ${key}:`, e);
          return false;
        }
      };
      // Update disposeFn to also delete hidden object
      const disposeFn = () => { this.$deleteVar(key); };
      return [existingNode as VarItemInstance, updateFn, disposeFn];
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

    // if the parent is observable, make the new node observable
    if (this.varDescriptor.observable) {
      __descriptor.observable = true;
    }

    // Create and set descriptor

    const finalDesc: VarDescriptor = { ...createDescriptor(varType), ...__descriptor };

    // Create VarItemInstance (leaf node)
    const xVar: VarItemInstance = { value: finalValue, varDescriptor: finalDesc };

    this.$varNodes.set(key, [xVar, { label: label || key, isLeaf: true, ...extraInfo }]);

    // === Set hidden object for the new leaf node ===
    const _hidden_obj_ = get_hidden_object(this);
    if (_hidden_obj_) {
      set_hidden_object(xVar, {
        $vs: _hidden_obj_.$vs,
        $path: _hidden_obj_.$path ? `${_hidden_obj_.$path}.${key}` : key,
        $pNode: this
      });
    } else {
      console.error(`[var-space]: Parent node for ${key} doesn't have hidden info. this should not happen`);
    }
    // =============================================

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
   * @param extraInfo Optional object to merge into the instance info.
   * @returns [ObjectNode, update, dispose], returns the registered object variable, update method, and dispose method
   */
  $appendNest(
    key: string, options: IVarMetaProps,
    extraInfo?: Record<string, any>
  ): [ObjectNode, /** update */(newData: object) => boolean, /** dispose */() => void] {
    // Check for duplicate registration
    if (this.$varNodes.has(key)) {
      console.warn(`Variable ${key} is already registered`);
      const existingNode = this.getChildNode(key);
      if (existingNode instanceof ObjectNode) {
        // Return existing object node
        // Get hidden object info for existing node
        const existingHidden = get_hidden_object(existingNode);
        const updateFn = (newData: object): boolean => {
          try {
            this[key] = newData;
            return true; // Assume success, rely on proxy logs for errors
          } catch (e) {
            console.error(`Update failed for ${key}:`, e);
            return false;
          }
        };
        // Update disposeFn to also delete hidden object
        const disposeFn = () => { this.$deleteVar(key); };
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

    // if the parent is observable, make the new node observable
    if (this.varDescriptor.observable) {
      descriptorProps.observable = true;
    }

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
      isLeaf: false,
      ...extraInfo // Merge extraInfo here
    };

    // Add to map
    this.$varNodes.set(key, [xObj, xInfo]);

    // === Set hidden object for the new nest node ===
    const _hidden_obj_ = get_hidden_object(this);
    if (_hidden_obj_) {
      set_hidden_object(x, {
        $vs: _hidden_obj_.$vs,
        $path: _hidden_obj_.$path ? `${_hidden_obj_.$path}.${key}` : key,
        $pNode: this
      });
    } else {
       console.error(`[var-space]: Parent node for ${key} doesn't have hidden info. -- this should not happen`);
    }
    // =============================================

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
    // === Delete hidden object before deleting from map ===
    const nodeToDelete = this.$varNodes.get(key)?.[0];
    if (nodeToDelete) {
      delete_hidden_object(nodeToDelete);
      // If the node being deleted is an ObjectNode, recursively delete hidden objects of its children
      if (nodeToDelete instanceof ObjectNode) {
          nodeToDelete.$varNodes.forEach(([childNode], childKey) => {
              delete_hidden_object(childNode); // Recursively delete
          });
      }
    }
    // ================================================
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
    // background data are not visible in struct
    if (Object.keys(this.$backgroundData || []).length > 0) {
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
      const instanceInfo = node[1]; // Get the InstanceInfo

      // Destructure known properties from InstanceInfo
      const { label, isLeaf, ...extraInfo } = instanceInfo;

      // Create basic structure
      const _struct: IVarStruct = {
        ...extraInfo,
        key,
        label: label || key, // Use label from InstanceInfo or key as fallback
        type: varObject.varDescriptor.nativeType,
        writable: varObject.varDescriptor.writable !== false,
        enumerable: varObject.varDescriptor.enumerable !== false,
        isLeaf: varObject instanceof ObjectNode ? false : true, // Derive isLeaf based on object type
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
   * - only for internal use.
   */
  __$dataHost: Record<string, any>;

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
    if (data.enumerable !== undefined) {
      this.varDescriptor.enumerable = data.enumerable
    }
    if (data.writable !== undefined) {
      this.varDescriptor.writable = data.writable
    }

    this.$buildHost()

    // === Initialize proxy first ===
    const proxiedThis = new Proxy(this, PROXY_HANDLER) as VarSpace;

    // === Set hidden object for the root VarSpace ===
    set_hidden_object(this, {
      $vs: this, // Root refers to itself
      $path: '',        // Root has empty path relative to itself
      $pNode: null      // Root has no parent
    });
    // =============================================
    queueMicrotask(() => {
      this.$syncHostBasedOnStruct()
    })

    return proxiedThis // Return the proxied instance
  }

  /**
   * Builds __$dataHost
   * - modifications are disallowed afterward, only updates via path are allowed.
   */
  private $buildHost(): void {
    let _hostRoot = {}
    if (this.varDescriptor.observable) {
      _hostRoot = observable.object(_hostRoot, {}, { deep: true })
    }

    Object.defineProperty(this, '__$dataHost', {
      enumerable: false,
      writable: false,
      configurable: false,
      value: _hostRoot
    })
  }

  /**
   * based on $varNodes, reset __$dataHost
   * This should be called when the structure ($varNodes) might have changed 
   * (e.g., after $appendLeaf, $appendNest, $deleteVar) and needs to be reflected
   * in the observable data host.
   */
  @action // Decorator assumes MobX configuration allows decorators, or use action() wrapper
  private $syncHostBasedOnStruct(): void {
    if (!this.__$dataHost) {
      console.error("__$dataHost is not built");
      return;
    }
    this._recursiveSync(this, this.__$dataHost);
  }

  /**
   * Recursive helper to synchronize a target data object with a source ObjectNode structure.
   * MUST be called within a MobX action.
   * @param sourceNode The ObjectNode containing the source structure and values.
   * @param targetData The corresponding data object within __$dataHost to update.
   */
  private _recursiveSync(sourceNode: ObjectNode, targetData: Record<string, any>): void {
    // 1. Sync existing/new keys from sourceNode to targetData
    sourceNode.$varNodes.forEach(([nodeInstance, info], key) => {
      if (nodeInstance instanceof ObjectNode) {
        // Ensure target has an object for the key
        if (!targetData.hasOwnProperty(key) || typeof targetData[key] !== 'object' || targetData[key] === null) {
          // Create a new deep observable object if missing or not an object, AND if the VarSpace is observable
          targetData[key] = nodeInstance.varDescriptor.observable ? observable.object({}, {}, { deep: true }) : {}; 
        } else if (nodeInstance.varDescriptor.observable && !isObservableObject(targetData[key])) {
           // If VS is observable and the existing nested object isn't, make it deep observable
          targetData[key] = observable.object(targetData[key], {}, { deep: true });
        }
        // Recurse into the nested object
        this._recursiveSync(nodeInstance, targetData[key]);
      } else {
        // Leaf node: Update value if different
        const currentValue = nodeInstance.value;
        if (!targetData.hasOwnProperty(key) || targetData[key] !== currentValue) {
          // Check if the *leaf itself* wants to be observable OR if the parent is already observable
          if (nodeInstance.varDescriptor.observable && !isObservableObject(targetData)) {
             // Use extendObservable to ensure the property assignment is tracked
             extendObservable(targetData, { [key]: observable }, {[key]: currentValue});
          } else {
             // Standard assignment for non-observable contexts
             targetData[key] = currentValue;
          }
        }
      }
    });

    // 2. Move keys from targetData to backgroundData if no longer in sourceNode.$varNodes
    Object.keys(targetData).forEach(key => {
      if (!sourceNode.$varNodes.has(key)) {
        // Value exists in observable data, but not in the current structure
        const valueToMove = targetData[key];
        // Move the value to backgroundData
        sourceNode.$backgroundData[key] = valueToMove;
        
        // Remove the key from the observable targetData
        delete targetData[key]; 
      }
    });
  }

  /**
   * Bulk sets data.
   * - Setting on var space synchronizes to __$dataHost.
   * @param data The data object to set.
   */
  @action
  $setData(data: object): void {
    super.$setData(data)
    // If __$dataHost is already built
    if (this.__$dataHost) {
      // Recursively sync to __$dataHost, currently only supports two levels of synchronization
      Object.entries(data).forEach(([key, value]) => {
        if (this.__$dataHost[key] !== value) {
          this.__$dataHost[key] = value;
        }
      });
    }
  }

  /**
   * Gets a node by path.
   * @param path The path to the node.
   * @param beginWithVsKey If true, the path must start with the VarSpace key or alias. Defaults to false.
   * @returns The node or null if not found.
   */
  getNodeByPath(path: string, beginWithVsKey: boolean = false): ObjectNode | VarItemInstance | null {
    let pathSegments = path.split('.');
    let current: ObjectNode | VarItemInstance = this;

    if (beginWithVsKey) {
      if (pathSegments.length === 0) {
        console.warn('getNodeByPath: Path cannot be empty when beginWithVsKey is true.');
        return null;
      }
      const scopeKey = pathSegments.shift(); // Remove the first segment (VS key/alias)
      if (scopeKey !== this.key && scopeKey !== this.alias) {
        console.warn(`getNodeByPath: Path scope "${scopeKey}" does not match VarSpace key "${this.key}" or alias "${this.alias}".`);
        return null;
      }
      // If only the VS key was provided, return the VarSpace itself
      if (pathSegments.length === 0) {
         return this; 
      }
    } 
    // If beginWithVsKey is false, or after removing the VS key, 
    // proceed to find the node within the children

    for (let i = 0; i < pathSegments.length; i++) {
      const key = pathSegments[i];
      if (!(current instanceof ObjectNode)) {
        // Use pathSegments for the slice and join
        console.warn(`Path ${pathSegments.slice(0, i).join('.')} is not an object node`)
        return null
      }

      const node: [VarItemInstance | ObjectNode, InstanceInfo] | undefined = current.$varNodes.get(key)
      if (!node) {
        console.warn(`Path ${key} not found`) // Should probably show full path like pathSegments.join('.')
        return null
      }

      current = node[0] // This assignment is now valid
    }

    return current
  }

  /**
   * Sets a value by path.
   * - 
   * @param path The path to the node.
   * @param value The value to set.
   * @param beginWithVsKey If true, the path must start with the VarSpace key or alias. Defaults to false.
   */
  setValueByPath(path: string, value: any, beginWithVsKey: boolean = false): void {
    let pathSegments = path.split('.');
    let inputPathForLogging = path; // Keep original path for logging

    if (beginWithVsKey) {
       if (pathSegments.length === 0) {
         console.warn(`setValueByPath: Path cannot be empty when beginWithVsKey is true.`);
         return;
       }
       const scopeKey = pathSegments.shift(); 
       if (scopeKey !== this.key && scopeKey !== this.alias) {
         console.warn(`setValueByPath: Path scope "${scopeKey}" does not match VarSpace key "${this.key}" or alias "${this.alias}".`);
         return;
       }
       // If only the VS key was provided, trying to set the VS itself? Not allowed.
       if (pathSegments.length === 0) {
          console.warn(`setValueByPath: Cannot set value directly on the VarSpace root using path "${inputPathForLogging}".`);
          return;
       }
    } 
    // pathSegments now contains the path relative to the VarSpace children

    if (pathSegments.length === 0) {
      console.warn(`setValueByPath: Invalid relative path derived from "${inputPathForLogging}"`);
      return;
    }

    const key = pathSegments[pathSegments.length - 1];
    const parentPath = pathSegments.slice(0, -1).join('.');

    // 1. Find Parent Node (using relative path segments)
    let parentNode: ObjectNode | VarItemInstance | null = null;
    if (pathSegments.length === 1) { // If only one segment left after removing VS key (or originally)
      parentNode = this;
    } else {
      // Find parent using the potentially shortened parentPath
      parentNode = this.getNodeByPath(parentPath, false); // IMPORTANT: Call getNodeByPath with false here
    }

    if (!parentNode) {
      console.warn(`setValueByPath: Parent node not found for relative path "${parentPath}" derived from "${inputPathForLogging}"`);
      return;
    }
    if (!(parentNode instanceof ObjectNode)) {
      console.warn(`setValueByPath: Parent node at "${parentPath}" is not an ObjectNode.`);
      return;
    }

    // 2. Find Target Node
    const targetNode = parentNode.$varNodes.get(key)?.[0];
    if (!targetNode) {
      console.warn(`setValueByPath: Target node not found for key "${key}" within parent "${parentPath}"`);
      return;
    }

    // 3. Validate Writability & Convert Value (using helper)
    // Use the original full path for more informative logging inside the helper
    const validationResult = validateAndConvertValue(targetNode, value, inputPathForLogging);

    if (!validationResult.success) {
      return;
    }

    const finalValue = validationResult.finalValue;

    // 4. Trigger the parent's proxy setter with the validated/converted value
    try {
      const proxyAssignmentSuccess = Reflect.set(parentNode, key, finalValue); // Use Reflect.set for clarity

      // 5. Sync __$dataHost only if proxy assignment also succeeded (Reflect.set returns true/false)
      if (proxyAssignmentSuccess && this.__$dataHost) {
        action(() => {
          let currentDataRef = this.__$dataHost;
          // Use relative pathSegments for __$dataHost sync
          for (let i = 0; i < pathSegments.length - 1; i++) {
            const segment = pathSegments[i];
            // Ensure intermediate paths exist in the data host
            if (currentDataRef[segment] === undefined || typeof currentDataRef[segment] !== 'object' || currentDataRef[segment] === null) {
               // If intermediate path doesn't exist or isn't an object, create it
               // This handles cases where structure was added but data host wasn't fully synced yet.
               // Check if the corresponding source node segment is observable
               const intermediateSourceNode = this.getNodeByPath(pathSegments.slice(0, i + 1).join('.'), false);
               const shouldBeObservable = intermediateSourceNode?.varDescriptor?.observable ?? false;
               currentDataRef[segment] = shouldBeObservable ? observable.object({}, {}, { deep: true }) : {};
               console.warn(`setValueByPath: __$dataHost sync created intermediate path ${pathSegments.slice(0, i + 1).join('.')}`);
            }
            currentDataRef = currentDataRef[segment];
          }
          // Now assign the final value to the correct key in the potentially nested structure
          if (currentDataRef[key] !== finalValue) {
            currentDataRef[key] = finalValue;
          }
        })();
      } else if (!proxyAssignmentSuccess) {
        // Reflect.set returns false if the proxy's set handler returned false OR if the property is non-writable/non-configurable
        console.warn(`setValueByPath: Assignment for "${path}" failed. Proxy trap likely returned false or property is restricted.`);
      }

    } catch (error) {
      // Log errors from validation (if thrown), proxy rejection (TypeError), or internal assignment errors
      console.error(`setValueByPath: Error during assignment or sync for path "${inputPathForLogging}":`, error);
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
      isLeaf: false, // VarSpace is not a leaf, Renamed from leaf
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
      [this.key]: this.__$dataHost
    };
    if (this.alias) {
      rst[this.alias] = this.__$dataHost
    }
    return rst;
  }
}