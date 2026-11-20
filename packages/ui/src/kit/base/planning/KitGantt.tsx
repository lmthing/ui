import { useState } from "react";
import { ChartGantt } from "@tamagui/lucide-icons";
import { isWeb, ScrollView, XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import { GanttDependencies, GanttLane, type Gate, type Link, type Range } from "./gantt-lanes";
import { laneHeight, timelineWidth } from "./gantt-layout";

import { GanttRail } from "./GanttRail";

type Column = { id: string; label: string };
type GanttProps = {
  part?: string;
  loading?: boolean;
  columns: readonly Column[];
  rows: readonly Range[];
  gates: readonly Gate[];
  links: readonly Link[];
};

function TimelineGrid({
  columns,
  lanes,
  loading,
}: {
  columns: readonly Column[];
  lanes: number;
  loading: boolean;
}) {
  return (
    <XStack fullscreen pointerEvents="none">
      {columns.map((column) => (
        <YStack
          key={column.id}
          flex={component.base.bodyFlex}
          minWidth={component.base.none}
          borderLeftWidth={component.base.borderWidth}
          borderColor="$line"
        >
          <YStack
            height={laneHeight}
            justifyContent="center"
            alignItems="center"
            paddingHorizontal={space.xs}
            backgroundColor="$raised"
            borderBottomWidth={component.base.borderWidth}
            borderColor="$line"
          >
            {loading ? (
              <YStack width="60%" height={space.sm} backgroundColor="$line" borderRadius={radius.pill} />
            ) : (
              <KitText role="label" tone="muted" lines={1} tabular align="center" part={null}>
                {column.label}
              </KitText>
            )}
          </YStack>
          {Array.from({ length: lanes }, (_, index) => (
            <YStack
              key={index}
              height={laneHeight}
              borderBottomWidth={component.base.borderWidth}
              borderColor="$line"
            />
          ))}
        </YStack>
      ))}
    </XStack>
  );
}

function GanttTimeline({
  columns,
  rows,
  gates,
  links,
  loading,
  width,
  scrollable,
  setViewport,
}: Omit<GanttProps, "part" | "loading"> & {
  loading: boolean;
  width: number;
  scrollable: boolean;
  setViewport: (width: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      minWidth={component.base.none}
      onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
      showsHorizontalScrollIndicator
      scrollEnabled={!loading}
      accessibilityLabel={
        loading
          ? undefined
          : columns
              .map((column) => column.label)
              .filter(Boolean)
              .join(", ") || undefined
      }
      {...(isWeb ? { role: "region", tabIndex: !loading && scrollable ? 0 : -1 } : {})}
    >
      <YStack width={width}>
        <TimelineGrid columns={columns} lanes={rows.length + gates.length} loading={loading} />
        <GanttDependencies {...{ rows, gates, links, width, loading }} />
        <YStack height={laneHeight} aria-hidden />
        {[...rows, ...gates].map((entry) => (
          <GanttLane key={entry.id} {...{ entry, width, loading }} />
        ))}
      </YStack>
    </ScrollView>
  );
}

const loadingRows = [
  { id: "first", label: "", start: 0, end: 0.5 },
  { id: "next", label: "", start: 0.25, end: 0.75 },
];
const loadingColumns = ["first", "next", "last"].map((id) => ({ id, label: "" }));

/** A fixed label rail beside a horizontally scrollable timeline. */
export function KitGantt({ part = "root", loading = false, columns, rows, gates, links }: GanttProps) {
  const ks = useKitStyle();
  const [viewport, setViewport] = useState(0);
  const address = usePart(part);
  const empty = !rows.length && !gates.length;
  const drawnRows = loading && empty ? loadingRows : rows;
  const drawnColumns = columns.length ? columns : loadingColumns;
  const width = timelineWidth(drawnColumns.length, viewport);
  const scrollable = width > viewport + component.base.borderWidth;
  return (
    <YStack {...address} aria-busy={loading || undefined} minWidth={component.base.none}>
      {empty && !loading ? (
        <YStack
          alignItems="center"
          paddingTop={space.lg}
          paddingBottom={space.xs}
          aria-hidden
          accessibilityElementsHidden
        >
          <ChartGantt size={size.icon.lg} color="$muted" />
        </YStack>
      ) : (
        <XStack
          {...({ "data-look-twoedge": true } as object)}
          aria-hidden={loading || undefined}
          accessibilityElementsHidden={loading || undefined}
          backgroundColor="$surface"
          borderWidth={component.base.borderWidth}
          borderColor="$line"
          borderRadius={shifted("lg", ks.radiusShift)}
          overflow="hidden"
        >
          <GanttRail entries={[...drawnRows, ...gates]} {...{ loading, scrollable }} />
          <GanttTimeline
            columns={drawnColumns}
            rows={drawnRows}
            {...{ gates, links, loading, width, scrollable, setViewport }}
          />
        </XStack>
      )}
    </YStack>
  );
}
