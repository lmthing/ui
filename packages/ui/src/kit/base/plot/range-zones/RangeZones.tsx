import { XStack, YStack } from "tamagui";
import { component, numberLine, radius, space } from "../../../../catalog";
import { useWords } from "../../../provider";
import { PlotLabel } from "../PlotParts";

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
      {zones.map(({ left, width, tone, from }, i) => (
        <YStack
          key={i}
          position="absolute"
          left={`${left * 100}%`}
          width={`${width * 100}%`}
          height={component.base.meter}
          backgroundColor={loading ? "$line" : `$${tone}`}
          {...(!loading && zones[i - 1]?.tone === tone && zones[i - 1]?.to === from
            ? { borderLeftWidth: component.base.borderWidth, borderLeftColor: "$bg", borderStyle: "solid" }
            : {})}
        />
      ))}
    </YStack>
  );
}

function LegendEntry({ zone: { label, from, to, tone }, loading }: { zone: PlacedZone; loading: boolean }) {
  const { lang } = useWords();
  return (
    <XStack flex={1} minWidth={component.base.none} gap={space.xs} alignItems="center">
      <YStack
        width={space.xs}
        height={space.xs}
        flexShrink={component.base.none}
        borderRadius={radius.pill}
        backgroundColor={loading ? "$line" : `$${tone}`}
        aria-hidden
        accessibilityElementsHidden
      />
      <YStack flexShrink={1} minWidth={component.base.none}>
        <PlotLabel
          label={`${label} (${numberLine(from, lang)}–${numberLine(to, lang)})`}
          role="caption"
          tone="text"
          loading={loading}
        />
      </YStack>
    </XStack>
  );
}

export function ZoneLegend({ zones, loading }: { zones: PlacedZone[]; loading: boolean }) {
  if (!zones.length) return null;
  return (
    <YStack gap={space.sm} aria-hidden={loading} accessibilityElementsHidden={loading}>
      {Array.from({ length: Math.ceil(zones.length / 2) }, (_, i) => (
        <XStack key={i} gap={space.sm}>
          <LegendEntry zone={zones[i * 2]!} loading={loading} />
          {zones[i * 2 + 1] ? (
            <LegendEntry zone={zones[i * 2 + 1]!} loading={loading} />
          ) : zones.length > 1 ? (
            <YStack flex={1} />
          ) : null}
        </XStack>
      ))}
    </YStack>
  );
}
