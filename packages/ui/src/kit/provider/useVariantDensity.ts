import { variantAxes, variants, type ThemeDensity } from "../../catalog";
import { useKitStyle } from "./useKitStyle";
import { useVariant } from "./useVariant";

export function useVariantDensity(value?: ThemeDensity) {
  const { densityKind } = useKitStyle();
  const finish = variants.density[useVariant("density", variantAxes.density.values, value)];
  return { ...finish[densityKind], ...finish };
}
