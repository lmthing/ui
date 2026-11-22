export type SiblingPart = { component: string; instance?: string | { prop: string }; part: string };
type Source = { scope: "component" | "item"; part: string };
type Payload = { from: string } | { value: string | number };
type Command =
  | { to: SiblingPart; action: "type"; payload: Payload; append?: true }
  | { to: SiblingPart; action: "set" | "select" | "seek"; payload: Payload }
  | { to: SiblingPart | { self: true; part: string }; action: "focus" | "jump" };
export type DriveCommand = Source & Command;

/** A part's press routes one local command. Observation projects runtime-only playback props. */
export type DriveBindings = {
  commands?: readonly DriveCommand[];
  observe?: { from: SiblingPart; at: string; playing?: string };
};
