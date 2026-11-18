import { YStack } from "tamagui";
import { size } from "../../../catalog";
import { KitText } from "../text";

/**
 * A place in a ranking: the number in a fixed-width column, the top three in accent. Decorative: the
 * order of the rows already says the place, so it is hidden from assistive tech and from the read.
 */
export function KitRank({ place }: { place: number }) {
  return (
    <YStack width={size.icon.lg} alignItems="center" aria-hidden>
      <KitText role="label" tone={place <= 3 ? "accent" : "muted"} tabular part={null}>
        {String(place)}
      </KitText>
    </YStack>
  );
}
