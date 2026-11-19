import { YStack } from "tamagui";
import { size, type ThemeDensity } from "../../../catalog";
import { usePart } from "../../part";
import { KitText } from "../text";

/**
 * A place in a ranking: a muted number in a fixed-width column. Decorative: the
 * order of the rows already says the place, so it is hidden from assistive tech and from the read.
 */
export function KitRank({
  place,
  part,
  density,
}: {
  place: number;
  part?: string;
  density?: ThemeDensity | undefined;
}) {
  const address = usePart(part ?? "rank", part !== undefined);
  return (
    <YStack {...(part === undefined ? {} : address)} width={size.icon.lg} alignItems="center" aria-hidden>
      <KitText role="label" tone="muted" tabular part={null} density={density}>
        {String(place)}
      </KitText>
    </YStack>
  );
}
