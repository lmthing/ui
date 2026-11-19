# kit/base/keys

Caller-supplied keypads. Depends only on the text base layer.
`KitNumberPad` draws an addressed value and three-column keys. By default the value
uses `target` as its address. With `displayPart`, the value uses that local part
and the keypad grid mounts at `target` with the `textbox` role.
Keys dispatch `type` values through the shared controller. On numeric `pad`
targets, use `{ append: "7" }`, `{ append: "." }`, `{ backspace: true }`, or
`{ clear: true }`. Plain strings replace the whole value. The controller stores
the decimal draft at the target address; pass that draft back as `value`.
Text, key meanings and disabled states belong to callers.
Loading retains geometry without offering key actions.
Use this folder's `index.ts` door.
