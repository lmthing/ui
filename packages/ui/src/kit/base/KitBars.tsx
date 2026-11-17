import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../catalog";
import { PartContext, usePart, usePartContext } from "../part";
import { KitText } from "./KitText";

function Bar({ label, value, max, high }: { label: string; value: number; max: number; high: boolean }) {
  const share = max > 0 ? Math.max(0, value) / max : 0;
  return (
    <YStack {...usePart()} flex={1} alignItems="center" gap={space.xs}>
      <YStack height={component.base.barsHeight} width="100%" justifyContent="flex-end" alignItems="center">
        <YStack
          width="70%"
          height={`${Math.max(share * 100, 2)}%`}
          borderTopLeftRadius={radius.sm}
          borderTopRightRadius={radius.sm}
          backgroundColor={high ? "$accent" : "$line"}
          aria-hidden
        />
      </YStack>
      <KitText role="caption" tone="muted" part="label" lines={1}>
        {label}
      </KitText>
    </YStack>
  );
}

/**
 * Amounts across days or categories: one column per point, scaled to the largest, the largest (or the
 * `highlight` index) in `$accent`, the rest in `$line`, labels under each. Each point is an item
 * (`<item>/root`, `<item>/label`); the bar drawing is hidden from assistive tech, so values belong in
 * the component's read line.
 */
export function KitBars({
  points,
  highlight,
}: {
  points: { id: string; label: string; value: number }[];
  highlight?: number;
}) {
  const context = usePartContext();
  const max = Math.max(...points.map((p) => p.value), 0);
  const top = highlight ?? points.findIndex((p) => p.value === max);
  return (
    <XStack gap={space.xs} alignItems="flex-end">
      {points.map((point, index) => (
        <PartContext.Provider key={point.id} value={{ ...context, item: point.id }}>
          <Bar label={point.label} value={point.value} max={max} high={index === top} />
        </PartContext.Provider>
      ))}
    </XStack>
  );
}
