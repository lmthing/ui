import { useState } from "react";
import { ChartGantt, ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { isWeb, ScrollView, XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import { GanttDependencies, GanttLane, type Gate, type Link, type Range } from "./gantt-lanes";
import {
  laneHeight,
  railWidth,
  range,
  rangeContinuation,
  timelineEdges,
  timelineWidth,
} from "./gantt-layout";

type Column = { id: string; label: string };
type GanttProps = {
  part?: string;
  loading?: boolean;
  columns: readonly Column[];
  rows: readonly Range[];
  gates: readonly Gate[];
  links: readonly Link[];
};

function GanttRail({ entries, loading }: { entries: readonly (Range | Gate)[]; loading: boolean }) {
  return (
    <YStack width={railWidth} flexShrink={component.base.none} backgroundColor="$raised">
      <YStack
        height={laneHeight}
        borderBottomWidth={component.base.borderWidth}
        borderColor="$line"
        justifyContent="center"
        paddingHorizontal={space.md}
      >
        {loading ? (
          <YStack width={size.icon.md} height={space.sm} backgroundColor="$line" borderRadius={radius.pill} />
        ) : (
          <ChartGantt size={size.icon.md} color="$muted" aria-hidden />
        )}
      </YStack>
      {entries.map((entry) => (
        <YStack
          key={entry.id}
          height={laneHeight}
          justifyContent="center"
          paddingHorizontal={space.md}
          borderBottomWidth={component.base.borderWidth}
          borderColor="$line"
        >
          {loading ? (
            <YStack width="80%" height={space.sm} backgroundColor="$line" borderRadius={radius.pill} />
          ) : (
            <KitText role="label" tone={"at" in entry ? "muted" : "text"} lines={2} part={null}>
              {entry.label}
            </KitText>
          )}
        </YStack>
      ))}
    </YStack>
  );
}

function TimelineGrid({
  columns,
  lanes,
  loading,
  width,
}: {
  columns: readonly Column[];
  lanes: number;
  loading: boolean;
  width: number;
}) {
  return (
    <XStack fullscreen pointerEvents="none">
      {columns.map((column) => (
        <YStack
          key={column.id}
          width={width / columns.length}
          flexShrink={component.base.none}
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

function TimelineCue({ side, lane }: { side: "left" | "right"; lane: number }) {
  const Glyph = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <YStack
      {...{ [side]: component.base.none, "data-viewport-cue": side }}
      position="absolute"
      top={lane * laneHeight + (laneHeight - size.icon.sm) / 2}
      borderRadius={radius.pill}
      backgroundColor="$raised"
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
    >
      <Glyph size={size.icon.sm} color="$text" />
    </YStack>
  );
}

function TimelineCues({
  rows,
  edges,
  width,
}: {
  rows: readonly Range[];
  edges: ReturnType<typeof timelineEdges>;
  width: number;
}) {
  return (
    <YStack fullscreen pointerEvents="none" aria-hidden>
      {(["left", "right"] as const).flatMap((side) =>
        edges[side]
          ? [
              <TimelineCue key={side} {...{ side }} lane={0} />,
              ...rows.map((row, index) =>
                rangeContinuation(range(row.start, row.end, width), edges)[side] ? (
                  <TimelineCue key={`${side}/${row.id}`} {...{ side }} lane={index + 1} />
                ) : null,
              ),
            ]
          : [],
      )}
    </YStack>
  );
}

function GanttTimeline({
  columns,
  rows,
  gates,
  links,
  loading,
  width,
  viewport,
  setViewport,
}: Omit<GanttProps, "part" | "loading"> & {
  loading: boolean;
  width: number;
  viewport: number;
  setViewport: (width: number) => void;
}) {
  const [scrollX, setScrollX] = useState(0);
  const edges = timelineEdges(width, viewport, scrollX);
  return (
    <YStack flex={1} minWidth={component.base.none} position="relative">
      <ScrollView
        horizontal
        minWidth={component.base.none}
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        onScroll={loading ? undefined : (event) => setScrollX(event.nativeEvent.contentOffset.x)}
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
        {...(isWeb ? { role: "region", tabIndex: !loading && (edges.left || edges.right) ? 0 : -1 } : {})}
      >
        <YStack width={width}>
          <TimelineGrid columns={columns} lanes={rows.length + gates.length} {...{ loading, width }} />
          <GanttDependencies {...{ rows, gates, links, width, loading }} />
          <YStack height={laneHeight} aria-hidden />
          {[...rows, ...gates].map((entry) => (
            <GanttLane key={entry.id} {...{ entry, width, loading }} />
          ))}
        </YStack>
      </ScrollView>
      {!loading && (edges.left || edges.right) && <TimelineCues {...{ rows, edges, width }} />}
    </YStack>
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
  return (
    <YStack {...address} aria-busy={loading || undefined} minWidth={component.base.none}>
      {empty && !loading ? (
        <YStack alignItems="center" paddingTop={space.sm} aria-hidden accessibilityElementsHidden>
          <YStack
            width={size.avatar.md}
            height={size.avatar.md}
            borderRadius={radius.pill}
            backgroundColor="$raised"
            alignItems="center"
            justifyContent="center"
          >
            <ChartGantt size={size.icon.lg} color="$muted" />
          </YStack>
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
          <GanttRail entries={[...drawnRows, ...gates]} loading={loading} />
          <GanttTimeline
            columns={drawnColumns}
            rows={drawnRows}
            {...{ gates, links, loading, width, viewport, setViewport }}
          />
        </XStack>
      )}
    </YStack>
  );
}
