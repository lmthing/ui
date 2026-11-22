import type { ReactNode } from "react";
import { isWeb, YStack, XStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { usePart } from "../../part";
import { KitIcon, KitText } from "../text";
import { PlotLabel } from "./PlotParts";
import { placeZones, ZoneLegend, ZoneTrack, type RangeZone } from "./range-zones";

type RangeBandProps = {
  part?: string;
  loading?: boolean;
  label: string;
  reading?: ReactNode;
  min: number;
  max: number;
  value: number;
  tone?: "text" | "warn";
} & (
  | { low: number; high: number; zones?: readonly RangeZone[] }
  | { zones: readonly RangeZone[]; low?: number; high?: number }
);

function scale(min: number, max: number) {
  const start = Math.min(min, max);
  const end = Math.max(min, max);
  return (n: number) =>
    !Number.isFinite(n) || end === start ? 0.5 : Math.min(1, Math.max(0, (n - start) / (end - start)));
}

function NormalBand({ low, high, loading }: { low: number; high: number; loading: boolean }) {
  const lower = Math.min(low, high);
  const upper = Math.max(low, high);
  const collapsed = lower === upper;
  return (
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
  );
}

function RangeDrawing({ min, max, low, high, value, tone, loading = false, zones }: RangeBandProps) {
  const ratio = scale(min, max);
  const placed = placeZones(zones, ratio);
  return (
    <>
      <YStack
        height={space.xl}
        justifyContent="center"
        paddingHorizontal={space.sm}
        aria-hidden
        accessibilityElementsHidden
      >
        <YStack height={component.base.meter} width="100%" backgroundColor="$line" borderRadius={radius.pill}>
          {placed?.length ? (
            <ZoneTrack zones={placed} loading={loading} />
          ) : low !== undefined && high !== undefined ? (
            <NormalBand low={ratio(low)} high={ratio(high)} loading={loading} />
          ) : null}
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
      {placed && <ZoneLegend zones={placed} loading={loading} />}
    </>
  );
}

function BandReading({ reading, loading }: { reading: ReactNode; loading: boolean }) {
  return (
    <YStack position="relative" pointerEvents={loading ? "none" : "auto"}>
      <YStack
        {...(loading
          ? {
              opacity: 0,
              "aria-hidden": true,
              accessibilityElementsHidden: true,
              ...(isWeb ? { style: { visibility: "hidden" } as never, inert: true } : {}),
            }
          : {})}
      >
        {reading}
      </YStack>
      {loading && (
        <YStack
          position="absolute"
          width="100%"
          maxWidth={size.control.md * 2}
          top={(typography.number.lineHeight - typography.number.size * 0.6) / 2}
          height={typography.number.size * 0.6}
          backgroundColor="$line"
          borderRadius={radius.sm}
          aria-hidden
        />
      )}
    </YStack>
  );
}

/** A caller-labelled reading and decorative normal band; visual endpoints stay inside the track. */
export function KitRangeBand({
  part = "root",
  loading = false,
  tone = "text",
  reading,
  ...props
}: RangeBandProps) {
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
          {reading === undefined ? (
            <XStack alignItems="center" gap={space.md}>
              <PlotLabel label={String(props.value)} role="number" tone={tone} loading={loading} />
              <YStack flex={1}>
                <PlotLabel label={props.label} tone="muted" loading={loading} />
              </YStack>
            </XStack>
          ) : (
            <BandReading reading={reading} loading={loading} />
          )}
          <RangeDrawing {...props} tone={tone} loading={loading} />
        </>
      )}
    </YStack>
  );
}
