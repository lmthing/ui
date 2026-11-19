import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import type { Values } from "../index";

export const sessionKey = "$session";
type Session = NonNullable<Meta["session"]>;
type Direction = "forward" | "reverse";
type Turn = { index: number; skipped: boolean };
type Progress =
  | { kind: "turns"; index: number; direction: Direction; history: readonly Turn[]; skips: number }
  | { kind: "rounds"; index: number; revealed: boolean };
type Stored = { inputs: string; progress: Progress };
type Get = (part: string) => unknown;
type Event = "next" | "back" | "skip" | "reverse" | "restart" | "reveal";
export type SessionState =
  | {
      kind: "turns";
      index: number;
      direction: Direction;
      lap: number;
      turns: number;
      skips: number;
      complete: boolean;
    }
  | { kind: "rounds"; index: number; revealed: boolean; complete: boolean; item: Values };

function itemsOf(session: Session, props: Values): readonly Values[] {
  const rows = props[session.items];
  return Array.isArray(rows) ? rows : [];
}
const seed = (props: Values, key?: string) => (key === undefined ? undefined : props[key]);
const lapsOf = (session: Extract<Session, { kind: "turns" }>, props: Values) =>
  Number(seed(props, session.laps) ?? Infinity);

function inputsFor(session: Session, props: Values) {
  const rows = itemsOf(session, props).map(({ id: _id, ...row }) => row);
  const inputs =
    session.kind === "turns"
      ? [seed(props, session.first) ?? 0, seed(props, session.direction) ?? "forward", lapsOf(session, props)]
      : [session.hidden];
  return JSON.stringify([session.items, rows, ...inputs]);
}

function initial(session: Session, props: Values): Progress {
  if (session.kind === "rounds") return { kind: "rounds", index: 0, revealed: false };
  return {
    kind: "turns",
    index: Number(seed(props, session.first) ?? 0),
    direction: seed(props, session.direction) === "reverse" ? "reverse" : "forward",
    history: [],
    skips: 0,
  };
}

function matching(session: Session, props: Values, stored: unknown) {
  const record = stored as Stored | undefined;
  return record?.progress?.kind === session.kind && record.inputs === inputsFor(session, props)
    ? record.progress
    : undefined;
}
export function staleSession(meta: Meta, props: Values, stored: unknown) {
  return stored !== undefined && meta.session !== undefined && !matching(meta.session, props, stored);
}

/** Both renderers and readers use this projection. A round exposes only its active, visible fields. */
export function sessionState(meta: Meta, props: Values, get: Get): SessionState | undefined {
  const session = meta.session;
  if (!session) return;
  const progress = matching(session, props, get(sessionKey)) ?? initial(session, props);
  const items = itemsOf(session, props);
  const count = items.length;
  if (!count) return;
  if (session.kind === "turns" && progress.kind === "turns") {
    const turns = progress.history.length;
    const laps = lapsOf(session, props);
    return {
      kind: "turns",
      index: progress.index,
      direction: progress.direction,
      lap: Math.min(laps, Math.floor(turns / count) + 1),
      turns,
      skips: progress.skips,
      complete: turns >= count * laps,
    };
  }
  if (session.kind === "rounds" && progress.kind === "rounds") {
    const { index, revealed } = progress;
    const row = items[index]!;
    const item = revealed
      ? row
      : Object.fromEntries(Object.entries(row).filter(([key]) => !session.hidden.includes(key)));
    return { kind: "rounds", index, revealed, item, complete: revealed && index === count - 1 };
  }
}

export function sessionStatus(meta: Meta, props: Values, state: StateName, get: Get): StateName {
  if (!meta.session || (state !== "filled" && state !== "success")) return state;
  const current = sessionState(meta, props, get);
  if (!current) return "empty";
  return (current.kind === "turns" ? current.complete : current.revealed) ? "success" : "filled";
}

export function sessionEvent(meta: Meta, part: string, action: string): Event | undefined {
  const session = meta.session;
  if (!session || action !== "press") return;
  const events: readonly Event[] =
    session.kind === "turns" ? ["next", "back", "skip", "reverse", "restart"] : ["reveal", "next", "restart"];
  const controls: Partial<Record<Event, string>> = session;
  return events.find((event) => controls[event] === part);
}

export function sessionAvailable(current: SessionState | undefined, event: Event): boolean {
  if (!current) return false;
  if (event === "restart") return true;
  if (current.kind === "rounds") {
    if (event === "reveal") return !current.revealed;
    return event === "next" && current.revealed && !current.complete;
  }
  return event === "back" ? current.turns > 0 : !current.complete;
}

function turnEvent(
  progress: Extract<Progress, { kind: "turns" }>,
  event: Event,
  count: number,
  laps: number,
): Progress {
  const { index, history, direction, skips } = progress;
  if (event === "reverse") return { ...progress, direction: direction === "forward" ? "reverse" : "forward" };
  if (event === "back") {
    const previous = history.at(-1)!;
    return {
      ...progress,
      index: previous.index,
      history: history.slice(0, -1),
      skips: skips - +previous.skipped,
    };
  }
  const skipped = event === "skip";
  const next =
    history.length + 1 < count * laps ? (index + (direction === "forward" ? 1 : -1) + count) % count : index;
  return { ...progress, index: next, history: [...history, { index, skipped }], skips: skips + +skipped };
}

/** Stage an already validated event; restarting clears only this component's progress. */
export function advanceSession(meta: Meta, props: Values, get: Get, event: Event): Stored | undefined {
  if (event === "restart") return;
  const session = meta.session!;
  const inputs = inputsFor(session, props);
  const before = matching(session, props, get(sessionKey)) ?? initial(session, props);
  const progress =
    session.kind === "turns" && before.kind === "turns"
      ? turnEvent(before, event, itemsOf(session, props).length, lapsOf(session, props))
      : ({
          kind: "rounds",
          index: before.index + (event === "next" ? 1 : 0),
          revealed: event === "reveal",
        } as const);
  return { inputs, progress };
}
