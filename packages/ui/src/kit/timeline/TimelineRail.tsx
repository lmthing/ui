import { KitContent, KitGrid, KitIcon, KitRow, KitText } from "../base";
import { timelineRows, type TimelineDensity, type TimelineLine, type TimelineRailRow } from "./TimelineRows";

/** A rail stays inside one stamped item. Its owner resolves disclosure state. */
export function TimelineRail({
  item,
  label,
  title,
  date,
  open,
  rows,
  density,
}: {
  item: string;
  label: string;
  title: TimelineLine;
  date: TimelineLine;
  open: boolean;
  rows: readonly TimelineRailRow[];
  density: TimelineDensity;
}) {
  return (
    <KitContent density={density}>
      <KitRow
        item={item}
        part="root"
        label={label}
        role="button"
        expanded={open}
        density="comfortable"
        lineRole="heading"
        tone="muted"
        trailing={<KitIcon name={open ? "minus" : "plus"} decorative />}
      >
        <KitText part={title.part} role="heading" density="comfortable">
          {title.text}
        </KitText>
        <KitText part={date.part} role="label" tone="muted" density="comfortable">
          {date.text}
        </KitText>
      </KitRow>
      {open && (
        <KitGrid
          arrange="rows"
          list
          listRowGap={density === "compact" ? undefined : "group"}
          density={density}
        >
          {timelineRows({ rows: rows.map((row) => ({ ...row, item })), density })}
        </KitGrid>
      )}
    </KitContent>
  );
}
