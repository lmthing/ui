import { XStack, YStack } from "tamagui";
import { component, numberLine, radius, space } from "../../../catalog";
import { useWords } from "../../provider";
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
          {...(i > 0 && !loading
            ? { borderLeftWidth: component.base.borderWidth, borderLeftColor: "$bg", borderStyle: "solid" }
            : {})}
        />
      ))}
    </YStack>
  );
}

export function ZoneLegend({ zones, loading }: { zones: PlacedZone[]; loading: boolean }) {
  const { lang } = useWords();
  return (
    zones.length > 0 && (
      <XStack flexWrap="wrap" gap={space.sm} aria-hidden={loading} accessibilityElementsHidden={loading}>
        {zones.map(({ label, from, to, tone }, i) => (
          <XStack key={i} gap={space.xs} alignItems="center" maxWidth="100%">
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
        ))}
      </XStack>
    )
  );
}
