import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { Svg, Path } from "react-native-svg";
import { XStack, YStack, useTheme } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { shifted } from "../text";
import { dependency, hitBox, laneHeight, milestone, range } from "./gantt-layout";
import { PlanningTargetScope, usePlanningTarget, type Target } from "./usePlanningTarget";

export type Range = {
  id: string;
  label: string;
  start: number;
  end: number;
  clippedStart?: boolean;
  clippedEnd?: boolean;
  conflict?: boolean;
  target?: Target;
};
export type Gate = { id: string; label: string; at: number; target?: Target };
export type Link = { from: string; to: string };

function RangeMark({ row, loading, width }: { row: Range; loading: boolean; width: number }) {
  const ks = useKitStyle();
  const box = range(row.start, row.end, width);
  const conflict = !loading && row.conflict;
  const stroke = conflict ? "$warn" : "$accent";
  const corners = shifted("sm", ks.radiusShift);
  return (
    <XStack
      position="absolute"
      left={box.left}
      width={box.width}
      height={space.lg}
      alignItems="center"
      justifyContent="space-between"
      overflow="hidden"
      borderRadius={corners}
      {...(row.clippedStart
        ? { borderTopLeftRadius: component.base.none, borderBottomLeftRadius: component.base.none }
        : {})}
      {...(row.clippedEnd
        ? { borderTopRightRadius: component.base.none, borderBottomRightRadius: component.base.none }
        : {})}
      borderWidth={component.base.borderWidth}
      borderStyle={conflict ? "dashed" : "solid"}
      borderColor={loading ? "$line" : stroke}
      backgroundColor={loading ? "$line" : conflict ? "$warnSoft" : "$accentSoft"}
      aria-hidden
      pointerEvents="none"
    >
      {!loading && row.clippedStart && <ChevronLeft size={size.icon.sm} color={stroke} />}
      {!loading && row.clippedEnd && (
        <YStack marginLeft="auto">
          <ChevronRight size={size.icon.sm} color={stroke} />
        </YStack>
      )}
    </XStack>
  );
}

function LaneHit(props: { entry: Range | Gate; loading: boolean; width: number; children: React.ReactNode }) {
  const { entry, loading, width, children } = props;
  const target = usePlanningTarget(entry.target, entry.label, loading);
  const box =
    "at" in entry ? { left: milestone(entry.at, width), width: 0 } : range(entry.start, entry.end, width);
  return (
    <YStack height={laneHeight} justifyContent="center">
      {children}
      {entry.target && !loading && (
        <YStack
          {...target}
          {...hitBox(box.left + box.width / 2, width, box.width)}
          position="absolute"
          height={laneHeight}
          borderRadius={radius.sm}
          focusVisibleStyle={{
            outlineColor: "$accent",
            outlineStyle: "solid",
            outlineWidth: component.base.strongBorder,
          }}
        />
      )}
    </YStack>
  );
}

export function GanttLane({
  entry,
  width,
  loading,
}: {
  entry: Range | Gate;
  width: number;
  loading: boolean;
}) {
  return (
    <PlanningTargetScope id={entry.id} target={entry.target}>
      <LaneHit {...{ entry, width, loading }}>
        {"at" in entry ? (
          <YStack
            position="absolute"
            left={Math.max(0, Math.min(milestone(entry.at, width) - space.sm / 2, width - space.sm))}
            width={space.sm}
            height={space.sm}
            rotate="45deg"
            borderWidth={component.base.borderWidth}
            borderColor={loading ? "$line" : "$accent"}
            backgroundColor={loading ? "$line" : "$accent"}
            pointerEvents="none"
            aria-hidden
          />
        ) : (
          <RangeMark row={entry} width={width} loading={loading} />
        )}
      </LaneHit>
    </PlanningTargetScope>
  );
}

export function GanttDependencies({
  rows,
  gates,
  links,
  width,
  loading,
}: {
  rows: readonly Range[];
  gates: readonly Gate[];
  links: readonly Link[];
  width: number;
  loading: boolean;
}) {
  const theme = useTheme();
  const points = new Map(rows.map((row, index) => [row.id, { index, ...range(row.start, row.end, width) }]));
  gates.forEach((gate, index) =>
    points.set(gate.id, {
      index: rows.length + index,
      left: milestone(gate.at, width),
      width: 0,
    }),
  );
  const anchors = [...points.values()];
  const height = (1 + rows.length + gates.length) * laneHeight;
  return (
    <YStack fullscreen aria-hidden pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {links.map(({ from, to }) => {
          const a = points.get(from);
          const b = points.get(to);
          return a && b && from !== to ? (
            <Path
              key={`${from}/${to}`}
              d={dependency(a, b, width, anchors)}
              fill="none"
              stroke={theme[loading ? "line" : "muted"]?.val}
              strokeWidth={component.base.borderWidth}
            />
          ) : null;
        })}
      </Svg>
    </YStack>
  );
}
