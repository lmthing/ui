import type { AxisValue, IconName } from "../../catalog";
import { KitContent, KitGrid, KitIcon, KitRow, KitText, KitTime, KitTrack } from "../base";

export type TimelineLine = { part: string; text: string };
export type TimelineDensity = AxisValue<"density"> | undefined;
type Title = { part: string | null; text: string };
type EventRow = {
  kind: "event";
  item: string;
  tone?: AxisValue<"tone"> | undefined;
  slots: { title: TimelineLine; time: TimelineLine; detail?: TimelineLine; done?: boolean };
};
type SummaryRow = {
  kind: "summary";
  item: string;
  label: string;
  slots: {
    title: TimelineLine;
    time: TimelineLine;
    byline: TimelineLine & { label: string; icon: IconName };
    status?: TimelineLine;
  };
};
export type TimelineRailRow<Part extends string = string> = {
  kind: "rail";
  part: Part;
  goto: string;
  slots: { title: Title; icon: IconName; time: TimelineLine; detail?: TimelineLine };
};
export type TimelineFlowRow = EventRow | SummaryRow;
type Row = TimelineFlowRow | (TimelineRailRow & { item: string });

function SummarySlots({
  slots,
  date,
  later,
}: {
  slots: SummaryRow["slots"];
  date?: TimelineLine | undefined;
  later: boolean;
}) {
  const { title, time, byline, status } = slots;
  return (
    <>
      {date && (
        <KitContent group={later ? "response" : "content"}>
          <KitText role="label" tone="muted" part={date.part}>
            {date.text}
          </KitText>
        </KitContent>
      )}
      <KitContent>
        <KitGrid columns={2} fitLast>
          <KitText part={title.part}>{title.text}</KitText>
          <KitIcon name="chevron_right" scale="sm" decorative />
        </KitGrid>
        <KitTrack part={byline.part} label={byline.label}>
          <KitText part={time.part} role="caption" tone="muted" tabular lines={1}>
            {time.text}
          </KitText>
          <KitIcon name={byline.icon} scale="sm" decorative />
          <KitText part={null} role="caption" tone="muted" lines={1}>
            {byline.text}
          </KitText>
        </KitTrack>
        {status && (
          <KitText part={status.part} role="caption" tone="warn">
            {status.text}
          </KitText>
        )}
      </KitContent>
    </>
  );
}

function rowEdges(row: Row) {
  if (row.kind === "summary") return {};
  const { time } = row.slots;
  if (row.kind === "rail")
    return {
      leading: <KitIcon name={row.slots.icon} decorative />,
      trailing: (
        <KitText part={time.part} role="label" tone="muted" tabular density="comfortable">
          {time.text}
        </KitText>
      ),
    };
  return {
    leading: <KitTime value={time.text} part={time.part} />,
    trailing: row.slots.done ? <KitIcon name="check" decorative /> : undefined,
  };
}

function TimelineRow({
  row,
  density,
  date,
  later,
}: {
  row: Row;
  density: TimelineDensity;
  date?: TimelineLine | undefined;
  later: boolean;
}) {
  const summary = row.kind === "summary";
  const rail = row.kind === "rail";
  const { title } = row.slots;
  const detail = summary ? undefined : row.slots.detail;
  const textDensity = rail ? "comfortable" : density;
  return (
    <KitRow
      item={row.item}
      part={rail ? row.part : "root"}
      label={summary ? row.label : title.text}
      {...(summary ? { role: "button", inline: true } : {})}
      goto={rail ? row.goto : undefined}
      tone={row.kind === "event" ? row.tone : undefined}
      density={density}
      {...rowEdges(row)}
    >
      {summary ? (
        <SummarySlots slots={row.slots} date={date} later={later} />
      ) : (
        <>
          <KitText part={title.part} role="body" density={textDensity}>
            {title.text}
          </KitText>
          {detail && (
            <KitText part={detail.part} role={rail ? "label" : "caption"} tone="muted" density={textDensity}>
              {detail.text}
            </KitText>
          )}
        </>
      )}
    </KitRow>
  );
}

export function timelineRows({
  rows,
  density,
  date,
  later = false,
}: {
  rows: readonly Row[];
  density?: TimelineDensity;
  date?: TimelineLine | undefined;
  later?: boolean;
}) {
  return rows.map((row, index) => (
    <TimelineRow
      key={row.kind === "rail" ? `${row.item}/${row.part}` : row.item}
      row={row}
      density={density}
      date={index === 0 ? date : undefined}
      later={later}
    />
  ));
}
