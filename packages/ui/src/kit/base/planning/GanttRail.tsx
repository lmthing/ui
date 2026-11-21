import { ChartGantt, ChevronsLeftRight } from "@tamagui/lucide-icons";
import { YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { KitText } from "../text";
import type { Gate, Range } from "./gantt-lanes";
import { laneHeight, railWidth } from "./gantt-layout";

export function GanttRail({
  entries,
  loading,
  scrollable,
}: {
  entries: readonly (Range | Gate)[];
  loading: boolean;
  scrollable: boolean;
}) {
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
        ) : scrollable ? (
          <ChevronsLeftRight size={size.icon.md} color="$muted" aria-hidden />
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
