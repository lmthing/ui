import { YStack } from "tamagui";
import { size } from "../../../catalog";
import { KitText } from "../text";

/**
 * A place in a ranking: a muted number in a fixed-width column. Decorative: the
 * order of the rows already says the place, so it is hidden from assistive tech and from the read.
 */
export function KitRank({ place }: { place: number }) {
  return (
    <YStack width={size.icon.lg} alignItems="center" aria-hidden>
      <KitText role="label" tone="muted" tabular part={null}>
        {String(place)}
      </KitText>
    </YStack>
  );
}
