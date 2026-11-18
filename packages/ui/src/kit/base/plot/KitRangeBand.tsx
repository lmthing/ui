import { YStack, XStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { usePart } from "../../part";
import { PlotLabel } from "./PlotParts";

type RangeBandProps = {
  part?: string;
  loading?: boolean;
  label: string;
  min: number;
  max: number;
  low: number;
  high: number;
  value: number;
  tone?: "text" | "warn";
};

/** Decorative normal band and clamped reading marker; the caller's label carries its meaning. */
export function KitRangeBand({
  part = "root",
  loading = false,
  label,
  min,
  max,
  low,
  high,
  value,
  tone = "text",
}: RangeBandProps) {
  const start = Math.min(min, max),
    end = Math.max(min, max);
  const ratio = (number: number) =>
    !Number.isFinite(number) || end === start
      ? 0.5
      : Math.min(1, Math.max(0, (number - start) / (end - start)));
  const lower = Math.min(ratio(low), ratio(high)),
    upper = Math.max(ratio(low), ratio(high));
  const marker = ratio(value);
  return (
    <YStack {...usePart(part)} gap={space.sm} width="100%" aria-busy={loading}>
      <PlotLabel label={label} loading={loading} tone={tone} />
      <YStack
        height={space.xl}
        justifyContent="center"
        paddingHorizontal={space.xs}
        aria-hidden
        accessibilityElementsHidden
      >
        <YStack height={component.base.meter} width="100%" backgroundColor="$line" borderRadius={radius.pill}>
          <YStack
            position="absolute"
            left={`${lower * 100}%`}
            width={`${(upper - lower) * 100}%`}
            minWidth={component.base.strongBorder}
            height={component.base.meter}
            backgroundColor={loading ? "$line" : "$good"}
            borderRadius={radius.pill}
          />
          {Number.isFinite(value) && (
            <XStack
              position="absolute"
              left={`${marker * 100}%`}
              top={-space.xs}
              marginLeft={-component.base.strongBorder}
              height={space.lg}
              width={component.base.strongBorder * 2}
              borderRadius={radius.pill}
              backgroundColor={loading ? "$line" : tone === "warn" ? "$warn" : "$text"}
            />
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}
