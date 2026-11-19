import type { variantAxes } from "../props";

export type Axis = keyof typeof variantAxes;
export type AxisValue<A extends Axis> = (typeof variantAxes)[A]["values"][number];
export type Variants = { readonly [A in Axis]?: readonly [AxisValue<A>, ...AxisValue<A>[]] };
type ItemAxis = "tone" | "mark" | "trail";
export type ItemVariants = Pick<Variants, ItemAxis>;
export type VariantParts = Readonly<
  Partial<
    Record<
      { [A in Axis]: `${A}.${AxisValue<A>}` }[Axis],
      {
        adds?: readonly string[];
        hides?: readonly string[];
      }
    >
  >
>;
