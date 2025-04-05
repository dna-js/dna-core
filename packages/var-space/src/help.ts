import type { ObjectNode, VarSpace } from "./var.creator"
import type { VarItemInstance } from "./var.type.define"

// ============================== hidden object =================================

type IHiddenObject = {
  $vs: VarSpace,
  $path: string,
  $pNode: ObjectNode | null
}

const __WeakRef_Obj_Map__: WeakMap<ObjectNode | VarItemInstance, IHiddenObject> = new WeakMap()

export function set_hidden_object(node: ObjectNode | VarItemInstance, obj: IHiddenObject) {
  __WeakRef_Obj_Map__.set(node, obj)
}

export function delete_hidden_object(node: ObjectNode | VarItemInstance) {
  __WeakRef_Obj_Map__.delete(node)
}

export function get_hidden_object(node: ObjectNode | VarItemInstance) {
  return __WeakRef_Obj_Map__.get(node)
}

(window as any).xx = __WeakRef_Obj_Map__

// ======================= inner logic control =========================================
let __auto_sync_struct_to_host__ = true;
