import { z } from "zod";
import type { Axis, ItemVariants, Variants } from "../../types";

type Enum<V extends string> = z.ZodEnum<{ [K in V]: K }>;
type Shape<D extends Variants, Inherited extends Axis> = {
  -readonly [A in keyof D]: A extends Axis
    ? A extends Inherited
      ? z.ZodOptional<Enum<Extract<NonNullable<D[A]>[number], string>>>
      : z.ZodDefault<Enum<Extract<NonNullable<D[A]>[number], string>>>
    : never;
};

function shape<const D extends Variants, const Inherited extends Axis>(axes: D, inherited: Inherited[]) {
  return Object.fromEntries(
    Object.entries(axes).map(([axis, values]) => {
      const schema = z.enum(values);
      return [axis, inherited.includes(axis as Inherited) ? schema.optional() : schema.default(values[0])];
    }),
  ) as unknown as Shape<D, Inherited>;
}

/** Omitted density stays unset for the kit to inherit from the app. */
export function variantProps<const D extends Variants>(axes: D) {
  return shape(axes, ["density"]);
}

/** Item defaults apply unless the collection opts in to inheriting its own trail. */
export function itemVariantProps<const D extends ItemVariants>(axes: D): Shape<D, never>;
export function itemVariantProps<const D extends ItemVariants>(
  axes: D,
  options: { inheritTrail: true },
): Shape<D, "trail">;
export function itemVariantProps<const D extends ItemVariants>(axes: D, options?: { inheritTrail: true }) {
  return options?.inheritTrail ? shape(axes, ["trail"]) : shape<D, never>(axes, []);
}
