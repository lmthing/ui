import type { ReactNode } from "react";
import { YStack, useTheme } from "tamagui";
import { Svg, Circle, Path, G } from "react-native-svg";
import { component, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { shifted, type TextTone } from "../text";

type RadialTrackProps = { part?: string; loading?: boolean } & (
  | { style: "rings"; rings: readonly { id: string; ratio: number; tone: TextTone }[]; children?: ReactNode }
  | {
      style: "days";
      segments: readonly { id: string; tone: TextTone; current?: boolean }[];
      children?: ReactNode;
    }
);
const box = component.base.ringLg + space.xl * 2;
const stroke = space.sm;

function RingDrawing({ rings, loading }: Extract<RadialTrackProps, { style: "rings" }>) {
  const theme = useTheme();
  const tracks = rings.length ? rings : [{ id: "empty", ratio: 0, tone: "muted" as const }];
  const width = Math.min(stroke, (box / 2 - space.lg) / (tracks.length * 2));
  return (
    <Svg width={box} height={box}>
      {tracks.map((ring, index) => {
        const radius = box / 2 - space.sm - width / 2 - index * width * 2;
        const length = 2 * Math.PI * radius;
        const ratio = Number.isFinite(ring.ratio) ? Math.min(1, Math.max(0, ring.ratio)) : 0;
        return (
          <G key={ring.id}>
            <Circle
              cx={box / 2}
              cy={box / 2}
              r={radius}
              fill="none"
              stroke={theme.line?.val}
              strokeWidth={width}
            />
            {ratio > 0 && (
              <Circle
                cx={box / 2}
                cy={box / 2}
                r={radius}
                fill="none"
                stroke={theme[loading ? "line" : ring.tone]?.val}
                strokeWidth={width}
                strokeDasharray={`${length * ratio} ${length}`}
                strokeLinecap={ratio === 1 ? "butt" : "round"}
                transform={`rotate(-90 ${box / 2} ${box / 2})`}
              />
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function DayDrawing({ segments, loading }: Extract<RadialTrackProps, { style: "days" }>) {
  const theme = useTheme();
  const radius = box / 2 - space.md - stroke / 2;
  const angle = (2 * Math.PI) / Math.max(1, segments.length);
  const gap = Math.min(angle / 4, component.base.strongBorder / radius);
  const at = (r: number, a: number) => [box / 2 + r * Math.sin(a), box / 2 - r * Math.cos(a)];
  return (
    <Svg width={box} height={box}>
      {!segments.length && (
        <Circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke={theme.line?.val}
          strokeWidth={stroke}
        />
      )}
      {segments.map((segment, index) => {
        const from = index * angle + gap;
        const to = (index + 1) * angle - gap;
        const start = at(radius, from);
        const end = at(radius, to);
        const current = at(box / 2 - space.xs, (index + 0.5) * angle);
        return (
          <Svg key={segment.id} width={box} height={box}>
            <Path
              d={`M${start} A${radius},${radius} 0 ${to - from > Math.PI ? 1 : 0} 1 ${end}`}
              fill="none"
              stroke={theme[loading ? "line" : segment.tone]?.val}
              strokeWidth={stroke}
            />
            {segment.current && (
              <Circle
                cx={current[0]}
                cy={current[1]}
                r={space.xs}
                fill={theme[loading ? "line" : segment.tone]?.val}
              />
            )}
          </Svg>
        );
      })}
    </Svg>
  );
}

/** Decorative concentric progress or day segments, with caller content on the shared centre axis. */
export function KitRadialTrack({ part = "root", loading = false, ...props }: RadialTrackProps) {
  const ks = useKitStyle();
  return (
    <YStack
      {...usePart(part)}
      width={box}
      height={box}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      aria-busy={loading}
    >
      <YStack
        position="absolute"
        top={component.base.none}
        left={component.base.none}
        width={box}
        height={box}
        aria-hidden
        accessibilityElementsHidden
      >
        {props.style === "rings" ? (
          <RingDrawing {...props} loading={loading} />
        ) : (
          <DayDrawing {...props} loading={loading} />
        )}
      </YStack>
      {loading
        ? props.children && (
            <YStack
              width={component.base.ringMd / 2}
              height={space.lg}
              borderRadius={shifted("sm", ks.radiusShift)}
              backgroundColor="$line"
              aria-hidden
            />
          )
        : props.children}
    </YStack>
  );
}
