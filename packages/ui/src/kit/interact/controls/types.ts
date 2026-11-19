import type { ActStep, Definition, ScreenLike, Values } from "../../../catalog";
import type { ControlChange } from "../index";
export type ControlContext = {
  screen: ScreenLike;
  entry: ScreenLike["components"][number];
  input: Values;
  def: Definition;
  values: Values;
  step: ActStep;
  now: number;
  lang?: string | undefined;
  target: string;
  index: number;
  get(part: string): unknown;
  put(part: string, value: unknown): void;
  bad(error: string, disabled?: boolean): ControlChange;
};
