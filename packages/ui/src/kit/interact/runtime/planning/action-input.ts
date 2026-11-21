import { parseControlProps, projectAdjustments, type Values } from "../../../../catalog";
import type { ControllerContext, ScreenComponent } from "../index";

export function actionInput(ctx: ControllerContext, entry: ScreenComponent, values: Values) {
  const def = ctx.defs[entry.c]!;
  const get = (part: string) => values[ctx.key(entry.id, part)];
  if (ctx.standalone) {
    const { meta } = def;
    const { id: _id, c: _c, state: _state, ...raw } = entry;
    const { session, successActions, errorActions, live } = meta;
    const useParsed =
      meta.confirmParts?.length &&
      (session || successActions?.length || errorActions?.length || live?.derive || meta.linkedEdits);
    return useParsed ? parseControlProps(def, raw, get) : raw;
  }
  const input = ctx.inputOf(entry);
  return def.meta.items?.set ? projectAdjustments(def.meta, input, get) : input;
}

export function disabledHint(component: string, action: string, input: Values) {
  if (component === "Composer" && action === "send" && !String(input.value ?? "").trim())
    return "Write a reply before sending";
  if (component === "Counter" && action === "decrement" && Number(input.value) < Number(input.step))
    return "The counter cannot go below zero";
}
