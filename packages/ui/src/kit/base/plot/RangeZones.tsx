import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { PlotLabel } from "./PlotParts";

export type RangeZone = {
  label: string;
  from: number;
  to: number;
  tone: "muted" | "accent" | "good" | "warn" | "bad";
};
type PlacedZone = RangeZone & { left: number; width: number };

export function placeZones(zones: readonly RangeZone[] | undefined, ratio: (n: number) => number) {
  return zones?.flatMap((zone) => {
    if (!Number.isFinite(zone.from) || !Number.isFinite(zone.to)) return [];
    const left = ratio(zone.from);
    const width = ratio(zone.to) - left;
    return Number.isFinite(width) && width > 0 ? [{ ...zone, left, width }] : [];
  });
}

export function ZoneTrack({ zones, loading }: { zones: PlacedZone[]; loading: boolean }) {
  return (
    <YStack height={component.base.meter} borderRadius={radius.pill} overflow="hidden">
      {zones.map(({ left, width, tone }, i) => (
        <YStack
          key={i}
          position="absolute"
          left={`${left * 100}%`}
          width={`${width * 100}%`}
          height={component.base.meter}
          backgroundColor={loading ? "$line" : `$${tone}`}
        />
      ))}
    </YStack>
  );
}

export function ZoneLegend({ zones, loading }: { zones: PlacedZone[]; loading: boolean }) {
  return (
    zones.length > 0 && (
      <XStack flexWrap="wrap" gap={space.sm} aria-hidden={loading} accessibilityElementsHidden={loading}>
        {zones.map(({ label, tone }, i) => (
          <XStack key={i} gap={space.xs} alignItems="center" maxWidth="100%">
            <YStack
              width={space.xs}
              height={space.xs}
              borderRadius={radius.pill}
              backgroundColor={loading ? "$line" : `$${tone}`}
              aria-hidden
              accessibilityElementsHidden
            />
            <PlotLabel label={label} role="caption" tone="text" loading={loading} />
          </XStack>
        ))}
      </XStack>
    )
  );
}
