import { useContext } from "react";
import { type as typography, variants, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useKitStyle, useVariantDensity } from "../../provider";
import { CardStyleContext } from "./style";

export type TextRole = keyof typeof typography;
export type TextFinish = { density?: ThemeDensity | undefined; emphasis?: AxisValue<"emphasis"> | undefined };

/** Match both the drawn text and the first-line slot next to it. */
export function useTextStep({ density, emphasis = "normal" }: TextFinish) {
  const steps = useVariantDensity(density).text;
  const treatment = variants.emphasis[emphasis].text;
  const { displayTitle } = useKitStyle().frame;
  const card = useContext(CardStyleContext);
  return (role: TextRole): TextRole =>
    steps[displayTitle && !card && emphasis === "normal" && role === "title" ? "display" : treatment[role]];
}
