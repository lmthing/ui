import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import { drawKey, drawRole, holdIndex, performDraw, storeDraw, type RandomSource } from "../draw";
import { advanceSession, sessionEvent, sessionKey } from "../session";
import { stageLinkedEdit } from "../linked-edits";
import {
  liveProps,
  parseControlProps,
  type ActStep,
  type Affordance,
  type ScreenLike,
  type Values,
} from "../index";
import { localValues } from "./select-step";

export function stageProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  found: Affordance,
  step: ActStep,
  next: Values,
  random: RandomSource | null,
  data?: DeviceData,
): string | undefined {
  const linked = stageLinkedEdit(screen, defs, next, found, step.value);
  if (linked !== undefined) return linked;
  const [id, ...parts] = step.address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const target = parts.join("/") || "root";
  const event = sessionEvent(def.meta, target, step.action);
  const role = drawRole(def.meta, target, step.action);
  if (!event && !role) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const parsed = parseControlProps(def, raw, get);
  const props = liveProps(def.meta, parsed, entry.id, localValues(screen.id, next), true, data);
  if (event) {
    next[`${screen.id}/${id}/${sessionKey}`] = advanceSession(
      def.meta,
      props,
      get,
      event,
      target,
      step.value,
    );
    return event === "answer" ? ` = ${JSON.stringify(step.value)}` : "";
  }
  if (!role) return;
  const outcome = performDraw(def.meta, props, get, role, target, step.value, random ?? (() => 0));
  next[`${screen.id}/${id}/${drawKey}`] = storeDraw(def.meta, props, outcome);
  if (!random && (role === "draw" || role === "redraw")) return "";
  const value =
    role === "hold" && outcome.kind === "faces" ? outcome.held[holdIndex(def.meta, target)] : outcome;
  return ` = ${JSON.stringify(value)}`;
}
