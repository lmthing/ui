import type { CommerceWords } from "..";

export const words = {
  variantUnavailable: "Sold out",
  shadeDepth: { fair: "Fair", light: "Light", medium: "Medium", deep: "Deep" },
  shadeUndertone: { cool: "Cool", neutral: "Neutral", warm: "Warm" },
  variantReading: (label, details) => [label, ...details].join(" · "),
} satisfies Pick<CommerceWords, "variantUnavailable" | "shadeDepth" | "shadeUndertone" | "variantReading">;
