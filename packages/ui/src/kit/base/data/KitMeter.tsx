import { isWeb, XStack, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { KitText } from "../text";
import { useMotionValue, useReducedFade } from "../../motion";
import { SkeletonText } from "../helpers";

/**
 * One labelled bar toward a target: the label and the amount on a line, a track under them and a fill to
 * `ratio` (0 to 1). The fill is `$accent`, or `tone` once a target is passed. Drawn inside an item (a
 * `KitRow`) that carries the address; the bar itself is hidden from assistive tech, so the amount is text.
 */
export function KitMeter({
  label,
  amount,
  exactAmount,
  ratio,
  tone = "accent",
  slim = false,
  addressed = true,
  fillFrom,
  loading = false,
}: {
  label: string;
  amount: string;
  /** A precise reading when the visual amount uses compact notation. */
  exactAmount?: string;
  ratio: number;
  tone?: "accent" | "good" | "warn" | "bad";
  slim?: boolean;
  /** Set false when the containing breakdown has one address and its individual bars are not parts. */
  addressed?: boolean;
  /** Anchor a comparison fill to the logical end (right in LTR, left in RTL). */
  fillFrom?: "start" | "end";
  loading?: boolean;
}) {
  const target = Math.min(1, Math.max(0, ratio));
  const fill = Math.min(1, Math.max(0, useMotionValue(target, loading)));
  const fade = useReducedFade(loading ? undefined : String(target));
  return (
    <YStack gap={space.xs} width="100%">
      <XStack justifyContent="space-between" alignItems="baseline" gap={space.sm}>
        <MeterLabel {...{ label, slim, addressed, loading }} />
        <MeterAmount amount={amount} exact={exactAmount} addressed={addressed} loading={loading} />
      </XStack>
      <YStack
        height={slim ? component.base.meterSlim : component.base.meter}
        borderRadius={radius.pill}
        backgroundColor="$line"
        overflow="hidden"
        aria-hidden
      >
        {!loading && (
          <YStack
            {...(fillFrom === "end" ? { alignSelf: "flex-end" as const } : {})}
            {...fade}
            width={`${fill * 100}%`}
            height="100%"
            backgroundColor={tone === "accent" ? "$accent" : `$${tone}`}
          />
        )}
      </YStack>
    </YStack>
  );
}

function MeterLabel({
  label,
  slim,
  addressed,
  loading,
}: {
  label: string;
  slim: boolean;
  addressed: boolean;
  loading: boolean;
}) {
  const role = slim ? "label" : "body";
  return (
    <YStack flexShrink={1} minWidth={component.base.none}>
      {loading ? (
        <SkeletonText text={label} role={role} baseline wrap />
      ) : (
        <KitText role={role} part={addressed ? "label" : null} breakLongWords>
          {label}
        </KitText>
      )}
    </YStack>
  );
}

function MeterAmount({
  amount,
  exact,
  addressed,
  loading,
}: {
  amount: string;
  exact?: string | undefined;
  addressed: boolean;
  loading: boolean;
}) {
  const labelled = exact && exact !== amount;
  if (loading) return <SkeletonText text={amount} role="caption" tabular baseline wrap />;
  const text = (
    <KitText role="caption" tone="muted" tabular part={addressed ? "amount" : null}>
      {amount}
    </KitText>
  );
  return labelled ? (
    <YStack accessible accessibilityRole={isWeb ? "group" : "text"} accessibilityLabel={exact}>
      <YStack aria-hidden accessibilityElementsHidden>
        {text}
      </YStack>
    </YStack>
  ) : (
    text
  );
}
