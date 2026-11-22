import type { CommerceWords } from "..";

export const words = {
  sizeGuide: {
    size: "Size",
    unit: "Measurement units",
    units: { cm: "cm", in: "in" },
    fit: "Fit",
    fitWords: ["Runs small", "True to size", "Runs large"],
    reference: (size) => `Reference size: ${size}`,
  },
} satisfies Pick<CommerceWords, "sizeGuide">;
