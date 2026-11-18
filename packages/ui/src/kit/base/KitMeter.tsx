import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../catalog";
import { KitText } from "./KitText";

/**
 * One labelled bar toward a target: the label and the amount on a line, a track under them and a fill to
 * `ratio` (0 to 1). The fill is `$accent`, or `tone` once a target is passed. Drawn inside an item (a
 * `KitRow`) that carries the address; the bar itself is hidden from assistive tech, so the amount is text.
 */
export function KitMeter({
  label,
  amount,
  ratio,
  tone = "accent",
  slim = false,
}: {
  label: string;
  amount: string;
  ratio: number;
  tone?: "accent" | "good" | "warn" | "bad";
  slim?: boolean;
}) {
  const fill = Math.min(1, Math.max(0, ratio));
  return (
    <YStack gap={space.xs} width="100%">
      <XStack justifyContent="space-between" alignItems="baseline" gap={space.sm}>
        <KitText role={slim ? "label" : "body"} part="label" lines={1}>
          {label}
        </KitText>
        <KitText role="caption" tone="muted" tabular part="amount">
          {amount}
        </KitText>
      </XStack>
      <YStack
        height={slim ? component.base.meterSlim : component.base.meter}
        borderRadius={radius.pill}
        backgroundColor="$line"
        overflow="hidden"
        aria-hidden
      >
        <YStack
          width={`${fill * 100}%`}
          height="100%"
          backgroundColor={tone === "accent" ? "$accent" : `$${tone}`}
        />
      </YStack>
    </YStack>
  );
}
