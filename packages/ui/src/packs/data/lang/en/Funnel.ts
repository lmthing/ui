import type { DataWords } from "..";

const funnelOverall = "Overall conversion";

export const words = {
  funnelConversion: (rate) => `${funnelOverall}: ${rate}`,
  funnelFromPrevious: (rate) => `From previous: ${rate}`,
  funnelOverall,
  funnelUnavailable: "Not available",
} satisfies Pick<
  DataWords,
  "funnelConversion" | "funnelFromPrevious" | "funnelOverall" | "funnelUnavailable"
>;
