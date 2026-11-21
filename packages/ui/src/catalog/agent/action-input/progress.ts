import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import { drawKey, drawRole, holdIndex, performDraw, storeDraw, type RandomSource } from "../draw";
import { buzzKey, buzzTarget, recordBuzz } from "../buzz";
import { advanceSession, sessionEvent, sessionKey } from "../session";
import { liveProps, parseControlProps, type ActStep, type ScreenLike, type Values } from "../index";
import { localValues } from "./select-step";

export function stageProgress(
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
  if (buzz !== null) {
    next[`${screen.id}/${id}/${buzzKey}`] = recordBuzz(get, buzz, touchNow);
    return "";
  }
  const event = sessionEvent(def.meta, target, step.action);
  const role = drawRole(def.meta, target, step.action);
  if (!event && !role) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
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
