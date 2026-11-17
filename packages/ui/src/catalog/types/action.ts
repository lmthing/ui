export type ActionName =
  | "press"
  | "toggle"
  | "check"
  | "select"
  | "type"
  | "set"
  | "increment"
  | "decrement"
  | "swipe"
  | "start"
  | "stop";
export type ScreenAction = "back" | "tab" | "scroll";
export type ActionSpec = {
  parts?: Record<string, readonly ActionName[]>;
  items?: Record<string, readonly ActionName[]>;
  /**
   * A part that exists only for some prop values: `{ back: { style: "back" }, trail: { trail: "toggle" } }`.
   * Read against the component's props for `parts`, against each item for `items`.
   */
  when?: Record<string, Record<string, string | boolean>>;
};
