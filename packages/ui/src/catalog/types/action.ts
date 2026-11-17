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
};
