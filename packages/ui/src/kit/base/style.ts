import { createContext } from "react";
import { component, radius, type KitStyle } from "../../catalog";

export type CardStyle = "plain" | "inset" | "cards";
export const CardStyleContext = createContext<CardStyle>("inset");
export function shifted(token: "sm" | "md" | "lg" | "xl", shift: KitStyle["radiusShift"]) {
  const steps = ["sm", "md", "lg", "xl"] as const;
  const index = Math.max(0, Math.min(steps.length - 1, steps.indexOf(token) + shift));
  return radius[steps[index]!];
}
export function surfaceOf(treatment: KitStyle["surface"]) {
  if (treatment === "hairline") return { backgroundColor: "$surface", borderColor: "$line",
    borderWidth: component.List.borderWidth } as const;
  if (treatment === "solid-accent") return { backgroundColor: "$accentSoft", borderColor: "$accent",
    borderWidth: component.List.borderWidth } as const;
  return { backgroundColor: "$raised", borderWidth: component.List.hidden } as const;
}
