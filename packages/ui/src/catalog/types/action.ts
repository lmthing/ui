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
  | "scan"
  | "copy";
export type ScreenAction = "back" | "tab" | "scroll";
/** Store-backed inputs and derived gates, applied to parsed props, never to Writer input. */
export type LiveActionInputs = {
  text?: Readonly<Record<string, { prop: string; max: number }>>;
  /** Item check or toggle part → the parsed boolean projected before deriving live props. */
  checks?: Readonly<Record<string, string>>;
  /** Component check or toggle part → one live boolean, seeded by a parsed boolean or `initial`. */
  toggles?: Readonly<Record<string, { prop: string; initial: boolean }>>;
  /** Send part → declared text input and optional audience prop, captured at the admitted step. */
  send?: Readonly<Record<string, { field: string; audience?: string }>>;
  /** Derive presentation props/gates, optionally closing over trusted host facts for this instance. */
  derive?: (props: Readonly<Record<string, unknown>>, instance: string) => Record<string, unknown>;
};
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
  /** Component toggle part → credential prop. A grant applies only to the exact credential. */
  credentialToggles?: Readonly<Record<string, string>>;
  /** These presses ignore their component/item's inherited `goto`, but not a link on the part itself. */
  noGoto?: { parts?: readonly string[]; items?: readonly string[] };
  /** Declared presses that require local host authentication before the view may reveal a secret. */
  reveal?: { parts?: readonly string[]; items?: readonly string[] };
};
