import type { ChooseProbe, ProbeResult } from "./types";
export const mergePairs = [
  {
    id: "sparkline_stats",
    ids: ["Sparkline", "Stats"],
    probes: [
      {
        kind: "choose",
        need: "Show my latest resting pulse, 62 beats a minute, with a small line tracing the last seven mornings",
        expect: "Sparkline",
      },
      {
        kind: "choose",
        need: "Show how my plant's height changed over the last six weeks, with its latest height prominent",
        expect: "Sparkline",
      },
      {
        kind: "choose",
        need: "Show walks booked, dogs walked and earnings beside each other",
        expect: "Stats",
      },
      {
        kind: "choose",
        need: "Show this week's walks and earnings beside each other, with an arrow on each number indicating whether it rose or fell",
        expect: "Stats",
      },
    ],
  },
] as const satisfies readonly { id: string; ids: readonly string[]; probes: readonly ChooseProbe[] }[];
/** Merge only when an unstable/failing sample actually confuses the two members of this pair. */
export function mergeDecision(ids: readonly string[], results: readonly ProbeResult[]): "merge" | "retain" {
  return results.some(
    (result) =>
      result.probe.kind === "choose" &&
      (result.status === "fail" || result.detail.startsWith("unstable")) &&
      ids.includes(result.reply.trim()) &&
      result.reply.trim() !== result.probe.expect,
  )
    ? "merge"
    : "retain";
}
