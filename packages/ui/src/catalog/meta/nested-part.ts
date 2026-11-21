export type NestedStep = {
  action: "increment" | "decrement";
  /** A literal number or the name of a numeric field on the same sub-item. */
  min: number | string;
  max: number | string;
  step: number | string;
};
export type NestedPart = {
  prop: string;
  /** A named control's true value, or a boolean property on the sub-item. */
  when?: string | { prop: string; equals: boolean };
} & ({ action: "toggle" | "set"; min?: number; max?: number; integer?: boolean } | NestedStep);
