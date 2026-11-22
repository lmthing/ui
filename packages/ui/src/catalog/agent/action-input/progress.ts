import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import { drawKey, drawRole, holdIndex, performDraw, staleDraw, storeDraw, type RandomSource } from "../draw";
import { buzzKey, buzzTarget, recordBuzz, staleBuzz } from "../buzz";
import { advanceSession, sessionEvent, sessionKey, staleSession } from "../session";
import {
  liveProps,
  parseControlProps,
  type ActStep,
  type Affordance,
  type ScreenLike,
  type Values,
} from "../index";
import { stageCredentialToggle } from "../credential-toggle";
import { stageLinkedEdit } from "../linked-edits";
import { stageRecord } from "./record-planning";
import { localValues } from "./select-step";

export function expireProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
) {
  for (const { id, c, state: _state, ...raw } of screen.components) {
    const def = defs[c];
    const base = `${screen.id}/${id}`;
    const get = (part: string) => values[`${base}/${part}`];
    if (!def || ![drawKey, sessionKey, buzzKey].some((part) => get(part) !== undefined)) continue;
    const parsed = parseControlProps(def, raw, get);
    const props = liveProps(def.meta, parsed, id, localValues(screen.id, values), true, data);
    if (def.meta.draw && staleDraw(def.meta, props, get(drawKey))) values[`${base}/${drawKey}`] = undefined;
    if (staleSession(def.meta, props, get(sessionKey))) values[`${base}/${sessionKey}`] = undefined;
    if (staleBuzz(def.meta, props, get(buzzKey))) values[`${base}/${buzzKey}`] = undefined;
  }
}

function stageProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  step: ActStep,
  next: Values,
  random: RandomSource | null,
  data: DeviceData | undefined,
  touchNow: () => number,
): string | undefined {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const target = parts.join("/") || "root";
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const buzz = buzzTarget(def.meta, target, step.action);
  const event = sessionEvent(def.meta, target, step.action);
  const role = drawRole(def.meta, target, step.action);
  if (buzz === null && !event && !role) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const parsed = parseControlProps(def, raw, get);
  const props = liveProps(def.meta, parsed, entry.id, localValues(screen.id, next), true, data);
  if (buzz !== null) {
    next[`${screen.id}/${id}/${buzzKey}`] = recordBuzz(def.meta, props, get, buzz, touchNow);
    return "";
  }
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
  touchNow: () => number,
) {
  const record = stageRecord(screen, defs, next, step, snapshot, now);
  if (record !== undefined) return record ? "" : false;
  return (
    stageCredentialToggle(screen, defs, next, step) ??
    stageLinkedEdit(screen, defs, next, found, step.value) ??
    stageProgress(screen, defs, step.address, step, next, random, snapshot, touchNow)
  );
}
