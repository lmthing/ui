import { YStack } from "tamagui";
import { component } from "../../../catalog";
import { KitText } from "../text";

/**
 * A time or short date in a fixed-width column (muted label, equal-width digits), so a list of times
 * lines up. Use it as a `KitRow` leading item. The text carries the part (default `time`).
 */
export function KitTime({ value, part = "time" }: { value: string; part?: string }) {
  return (
    <YStack width={component.base.timeWidth}>
      <KitText role="label" tone="muted" part={part} tabular lines={1}>
        {value}
      </KitText>
    </YStack>
  );
}
