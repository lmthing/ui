import { YStack, XStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { usePart } from "../../part";
import { KitIcon, KitText } from "../text";
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

function RangeDrawing({ min, max, low, high, value, tone, loading }: RangeBandProps) {
  const start = Math.min(min, max),
    end = Math.max(min, max);
  const ratio = (n: number) =>
    !Number.isFinite(n) || end === start ? 0.5 : Math.min(1, Math.max(0, (n - start) / (end - start)));
  const lower = Math.min(ratio(low), ratio(high)),
    upper = Math.max(ratio(low), ratio(high));
  const collapsed = lower === upper;
  return (
    <YStack
      height={space.xl}
      justifyContent="center"
      paddingHorizontal={space.sm}
      aria-hidden
      accessibilityElementsHidden
    >
      <YStack height={component.base.meter} width="100%" backgroundColor="$line" borderRadius={radius.pill}>
        <YStack
          position="absolute"
          left={`${lower * 100}%`}
          width={`${(upper - lower) * 100}%`}
          minWidth={collapsed ? space.md : component.base.strongBorder}
          marginLeft={collapsed ? -space.md / 2 : component.base.none}
          height={component.base.meter}
          backgroundColor={loading ? "$line" : "$good"}
          borderRadius={radius.pill}
        />
        {Number.isFinite(value) && (
          <XStack
            position="absolute"
            left={`${ratio(value) * 100}%`}
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
  );
}

/** A caller-labelled reading and decorative normal band; visual endpoints stay inside the track. */
export function KitRangeBand({ part = "root", loading = false, tone = "text", ...props }: RangeBandProps) {
  const empty = !Number.isFinite(props.value);
  return (
    <YStack {...usePart(part)} gap={space.sm} width="100%" aria-busy={loading}>
      {empty && !loading ? (
        <YStack
          minHeight={component.base.blockMinHeight + space.xl * 2}
          padding={space.xl}
          alignItems="center"
          justifyContent="center"
          gap={space.md}
        >
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText role="body" tone="muted" align="center" part={null}>
            {props.label}
          </KitText>
        </YStack>
      ) : (
        <>
          <XStack alignItems="center" gap={space.md}>
            <PlotLabel label={String(props.value)} role="number" tone={tone} loading={loading} />
            <YStack flex={1}>
              <PlotLabel label={props.label} tone="muted" loading={loading} />
            </YStack>
          </XStack>
          <RangeDrawing {...props} tone={tone} loading={loading} />
        </>
      )}
    </YStack>
  );
}
