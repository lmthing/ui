import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../catalog";
import { PartContext, usePart, usePartContext } from "../part";
import { KitText } from "./KitText";

// One accent, fading by step in the order the parts are written.
const fade = (index: number) => Math.max(component.base.shareFloor, 1 - index * component.base.shareStep);

function Entry({
  label,
  value,
  percent,
  index,
}: {
  label: string;
  value: number;
  percent: string;
  index: number;
}) {
  return (
    <XStack {...usePart()} alignItems="center" gap={space.sm}>
      <YStack
        width={component.base.dot}
        height={component.base.dot}
        borderRadius={radius.pill}
        backgroundColor="$accent"
        opacity={fade(index)}
        aria-hidden
      />
      <KitText role="body" part="label" lines={1}>
        {label}
      </KitText>
      <YStack flex={1} />
      <KitText role="body" tone="muted" tabular part={null}>
        {`${value}`}
      </KitText>
      <KitText role="label" tone="muted" tabular part={null}>
        {percent}
      </KitText>
    </XStack>
  );
}

/**
 * How a whole splits into parts: one full-width bar cut into shares (in fading accent, in the order given) over
 * a legend of label, value and percent. Each part is an item (`<item>/root`, `<item>/label`); the bar
 * drawing is hidden from assistive tech, so shares belong in the component's read line.
 */
export function KitShare({
  points,
  percentOf,
}: {
  points: readonly { id: string; label: string; value: number }[];
  percentOf: (value: number, total: number) => string;
}) {
  const context = usePartContext();
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <YStack gap={space.md}>
      <XStack
        height={space.md}
        borderRadius={radius.pill}
        overflow="hidden"
        backgroundColor="$line"
        aria-hidden
      >
        {points.map((point, index) => (
          <YStack
            key={point.id}
            flexGrow={point.value}
            flexBasis={component.base.none}
            backgroundColor="$accent"
            opacity={fade(index)}
          />
        ))}
      </XStack>
      {points.map((point, index) => (
        <PartContext.Provider key={point.id} value={{ ...context, item: point.id }}>
          <Entry
            label={point.label}
            value={point.value}
            percent={percentOf(point.value, total)}
            index={index}
          />
        </PartContext.Provider>
      ))}
    </YStack>
  );
}
