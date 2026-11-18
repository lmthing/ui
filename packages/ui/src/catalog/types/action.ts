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
  | "stop"
  | "dismiss"
  | "play"
  | "pause"
  | "seek"
  | "flip"
  | "move"
  | "send"
  | "scan";
export type ScreenAction = "back" | "tab" | "scroll";
export type ActionSpec = {
  parts?: Record<string, readonly ActionName[]>;
  items?: Record<string, readonly ActionName[]>;
  /**
   * A part that exists only for some prop values: `{ back: { style: "back" }, trail: { trail: "toggle" } }`.
   * Read against the component's props for `parts`, against each item for `items` (a key the item
   * lacks is read from the component's props). A key `part.action` limits one action:
   * `{ "root.toggle": { style: "filter" }, "root.select": { style: "choose" } }`. `$first: true`
   * matches only the first item.
   */
  when?: Record<string, Record<string, string | boolean>>;
};
