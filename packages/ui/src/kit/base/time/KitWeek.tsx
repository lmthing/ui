import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, space, weekdayInitials } from "../../../catalog";
import { usePart } from "../../part";
import { KitDayMark } from "./KitDay";
import { KitText } from "../text";

const Column = ({ children }: { children?: ReactNode }) => (
  <YStack flex={1} flexBasis={component.base.none} alignItems="center" minWidth={component.base.none}>
    {children}
  </YStack>
);

/**
 * A calendar grid: weekday initials (Monday first) over rows of seven equal columns. `cells` holds one
 * entry per slot, `null` for a blank before day 1 or after the last day; put a `KitDay` in each day.
 */
export function KitWeekGrid({ cells }: { cells: readonly (ReactNode | null)[] }) {
  const rows = Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );
  return (
    <YStack gap={space.xs}>
      <XStack aria-hidden>
        {weekdayInitials.map((day, index) => (
          <Column key={index}>
            <KitText role="caption" tone="muted" part={null}>
              {day}
            </KitText>
          </Column>
        ))}
      </XStack>
      {rows.map((row, index) => (
        <XStack key={index}>
          {Array.from({ length: 7 }, (_, column) => (
            <Column key={column}>{row[column] ?? null}</Column>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

/** This week as seven markers (done or not) with weekday initials below; decorative, one part (`days`). */
export function KitWeekStrip({ days, part = "days" }: { days: readonly boolean[]; part?: string }) {
  return (
    <XStack {...usePart(part)} aria-hidden accessibilityElementsHidden>
      {weekdayInitials.map((day, index) => (
        <Column key={index}>
          <YStack gap={space.xs} alignItems="center">
            <KitDayMark done={Boolean(days[index])} />
            <KitText role="caption" tone="muted" part={null}>
              {day}
            </KitText>
          </YStack>
        </Column>
      ))}
    </XStack>
  );
}
