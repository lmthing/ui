import { type as typography, variants, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useKitStyle, useVariantDensity } from "../../provider";

export type TextRole = keyof typeof typography;
export type TextFinish = { density?: ThemeDensity | undefined; emphasis?: AxisValue<"emphasis"> | undefined };

/** Match both the drawn text and the first-line slot next to it. */
export function useTextStep({ density, emphasis = "normal" }: TextFinish) {
  const steps = useVariantDensity(density).text;
  const treatment = variants.emphasis[emphasis].text;
  const { strong } = useKitStyle();
  return (role: TextRole): TextRole =>
    steps[strong && emphasis === "normal" && role === "title" ? "display" : treatment[role]];
}
