# kit/base/keys

Caller-supplied keypads. Depends only on the text base layer.
`KitNumberPad` draws an addressed value and three-column keys. By default the value
uses `target` as its address. With `displayPart`, the value uses that local part
and the keypad grid mounts at `target` with the `textbox` role.
Opt a `type` part in with `.meta({ keypadParts: ["pad"] })` on the component's
props schema. The named part need not be `pad`. For keypad edits use
`{ append: "7" }`, `{ append: "." }`, `{ backspace: true }`, or
`{ clear: true }`. Plain strings replace the whole value. The controller stores
the decimal draft at the target address; pass that draft back as `value`.
For a `root` target, omit the trailing `/root` when looking up the draft:
the textbox uses `screen/component/root`, the store uses `screen/component`.
The kit reader passes that same string, including `""` after clear, as `value`
to `meta.read`; before an edit, `meta.read` receives the original value.
Text, key meanings and disabled states belong to callers.
Loading retains geometry without offering key actions.
Use this folder's `index.ts` door.
