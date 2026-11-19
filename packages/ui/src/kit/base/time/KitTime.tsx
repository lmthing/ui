import { YStack } from "tamagui";
import { component } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { KitText } from "../text";

/**
 * A time or short date in a fixed-width column (muted label, equal-width digits), so a list of times
 * lines up. Use it as a `KitRow` leading item. The text carries the part (default `time`).
 */
export function KitTime({ value, part = "time" }: { value: string; part?: string }) {
  const ks = useKitStyle();
  const weekday = !/\p{Nd}/u.test(value);
  return (
    <YStack width={component.base.timeWidth}>
      <KitText
        role={ks.strong && weekday ? "body" : "label"}
        tone={ks.strong && weekday ? "text" : "muted"}
        part={part}
        tabular
        lines={1}
      >
        {value}
      </KitText>
    </YStack>
  );
}
