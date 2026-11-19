import { variantAxes, variants, type Axis, type AxisValue, type ThemeDensity } from "../../catalog";
import { useKit } from "./useKit";

/** Resolve only values declared by the caller. The first declared value is its local default. */
export function useVariant<A extends Axis, const D extends readonly [AxisValue<A>, ...AxisValue<A>[]]>(
  axis: A,
  declared: D,
  value?: AxisValue<NoInfer<A>>,
): D[number] {
  const { density } = useKit();
  return resolveVariant(declared, value, axis === "density" ? density : undefined);
}

export function resolveVariant<const D extends readonly [string, ...string[]]>(
  declared: D,
  value?: string,
  appValue?: string,
): D[number] {
  return (
    declared.find((choice) => choice === value) ??
    declared.find((choice) => choice === appValue) ??
    declared[0]
  );
}

export function useVariantDensity(value?: ThemeDensity) {
  const { style } = useKit();
  const { text, contentGap, columnGap, stripGap, ...spacing } =
    variants.density[useVariant("density", variantAxes.density.values, value)];
  return { ...spacing[style.densityKind], text, contentGap, columnGap, stripGap };
}
