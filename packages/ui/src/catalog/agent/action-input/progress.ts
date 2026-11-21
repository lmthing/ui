import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import { drawKey, drawRole, holdIndex, performDraw, storeDraw, type RandomSource } from "../draw";
import { advanceSession, sessionEvent, sessionKey } from "../session";
import {
  liveProps,
  parseControlProps,
  type ActStep,
  type Affordance,
  type ScreenLike,
  type Values,
} from "../index";
import { stageLinkedEdit } from "../linked-edits";
import { stageRecord } from "./record-planning";
import { localValues } from "./select-step";

function stageProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  step: ActStep,
  next: Values,
  random: RandomSource | null,
  data?: DeviceData,
): string | undefined {
  const [id, ...parts] = address.split("/");
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

export function stageStepProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  step: ActStep,
  found: Affordance,
  random: RandomSource | null,
  snapshot: DeviceData | undefined,
  now: number,
) {
  const record = stageRecord(screen, defs, next, step, snapshot, now);
  if (record !== undefined) return record ? "" : false;
  return (
    stageLinkedEdit(screen, defs, next, found, step.value) ??
    stageProgress(screen, defs, step.address, step, next, random, snapshot)
  );
}
