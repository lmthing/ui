import { variants, type Axis, type AxisValue, type ThemeDensity } from "../../catalog";
import { useKit } from "./useKit";

/** Resolve only values declared by the caller. The first declared value is its local default. */
export function useVariant<A extends Axis, const D extends readonly [AxisValue<A>, ...AxisValue<A>[]]>(
  _axis: A,
  declared: D,
  value?: AxisValue<NoInfer<A>>,
): D[number] {
  return resolveVariant(declared, value);
}

export function resolveVariant<const D extends readonly [string, ...string[]]>(
  declared: D,
  value?: string,
): D[number] {
  return declared.find((choice) => choice === value) ?? declared[0];
}

export function useVariantDensity(value?: ThemeDensity) {
  const { style, density } = useKit();
  const { text, contentGap, columnGap, stripGap, ...spacing } = variants.density[value ?? density];
  return { ...spacing[style.densityKind], text, contentGap, columnGap, stripGap };
}
