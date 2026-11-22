import { timelineRows, type TimelineDensity, type TimelineFlowRow, type TimelineLine } from "./TimelineRows";

export type TimelineFlowGroup = {
  date?: TimelineLine;
  rows: readonly TimelineFlowRow[];
};

export function TimelineFlow({
  groups,
  density,
}: {
  groups: readonly TimelineFlowGroup[];
  density?: TimelineDensity;
}) {
  return groups.flatMap(({ date, rows }, index) => timelineRows({ rows, date, later: index > 0, density }));
}
