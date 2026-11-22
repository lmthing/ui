import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { KitText } from "../text";

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
  addressed = true,
  fillFrom,
}: {
  label: string;
  amount: string;
  ratio: number;
  tone?: "accent" | "good" | "warn" | "bad";
  slim?: boolean;
  /** Set false when the containing breakdown has one address and its individual bars are not parts. */
  addressed?: boolean;
  /** Anchor a comparison fill to the logical end (right in LTR, left in RTL). */
  fillFrom?: "start" | "end";
}) {
  const fill = Math.min(1, Math.max(0, ratio));
  return (
    <YStack gap={space.xs} width="100%">
      <XStack justifyContent="space-between" alignItems="baseline" gap={space.sm}>
        <KitText role={slim ? "label" : "body"} part={addressed ? "label" : null} lines={1}>
          {label}
        </KitText>
        <KitText role="caption" tone="muted" tabular part={addressed ? "amount" : null}>
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
          {...(fillFrom === "end" ? { alignSelf: "flex-end" as const } : {})}
          width={`${fill * 100}%`}
          height="100%"
          backgroundColor={tone === "accent" ? "$accent" : `$${tone}`}
        />
      </YStack>
    </YStack>
  );
}
