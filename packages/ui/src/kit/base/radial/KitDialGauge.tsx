import { Circle, Path, Svg } from "react-native-svg";
import { XStack, YStack, useTheme } from "tamagui";
import { component, radius, space, type as typography } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { usePart } from "../../part";
import { useKit } from "../../provider";
import { KitText } from "../text";

type DialProps = {
  part?: string;
  loading?: boolean;
  ratio: number;
  value: string;
  unit: string;
  phase: string;
  scaleLabels?: readonly string[];
};

const box = component.base.ringLg + space.xl * 2;
const hub = box / 2;
const track = hub - space.md;
const start = -Math.PI * (3 / 4);
const sweep = -start * 2;
const width = space.sm;
const at = (ratio: number) => {
  const angle = start + ratio * sweep;
  return [hub + track * Math.sin(angle), hub - track * Math.cos(angle)] as const;
};

export function dialRatio(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

const path = (ratio: number) =>
  `M${at(0)} A${track},${track} 0 ${ratio * sweep > Math.PI ? 1 : 0} 1 ${at(ratio)}`;

function DialArc({ ratio, loading }: Pick<DialProps, "ratio" | "loading">) {
  const theme = useTheme();
  const { environment } = useKit();
  const target = loading ? 0 : dialRatio(ratio);
  const settled = loading || environment.reduceMotion || environment.agentMode;
  const animated = useAnimatedValue(target, settled);
  const shown = settled ? target : dialRatio(animated);
  const [x, y] = at(shown);
  return (
    <YStack position="absolute" inset={component.base.none} aria-hidden accessibilityElementsHidden>
      <Svg width="100%" height="100%" viewBox={`0 0 ${box} ${box}`}>
        <Path d={path(1)} fill="none" stroke={theme.line?.val} strokeWidth={width} strokeLinecap="round" />
        {shown > 0 && (
          <>
            <Path
              d={path(shown)}
              fill="none"
              stroke={theme.accent?.val}
              strokeWidth={width}
              strokeLinecap="round"
            />
            <Circle
              cx={x}
              cy={y}
              r={width / 2}
              fill={theme.onAccent?.val}
              stroke={theme.accent?.val}
              strokeWidth={component.base.strongBorder}
            />
          </>
        )}
      </Svg>
    </YStack>
  );
}

function Reading({ value, unit, phase }: Pick<DialProps, "value" | "unit" | "phase">) {
  return (
    <YStack alignItems="center" maxWidth={component.base.ringMd} gap={space.xs} aria-live="polite">
      <KitText part={null} role="number" tabular align="center">
        {value}
      </KitText>
      <KitText part={null} role="caption" tone="muted" align="center">
        {unit}
      </KitText>
      <YStack
        borderRadius={radius.pill}
        backgroundColor="$accentSoft"
        paddingHorizontal={space.sm}
        paddingVertical={space.xs}
      >
        <KitText part={null} role="caption" tone="text" align="center">
          {phase}
        </KitText>
      </YStack>
    </YStack>
  );
}

function ReadingPlaceholder() {
  return (
    <YStack alignItems="center" gap={space.sm} aria-hidden>
      <YStack
        width={component.base.timeWidth}
        height={typography.number.size}
        backgroundColor="$line"
        borderRadius={radius.sm}
      />
      <YStack
        width={component.base.timeWidth / 2}
        height={space.sm}
        backgroundColor="$line"
        borderRadius={radius.sm}
      />
      <YStack
        width={component.base.timeWidth}
        height={space.lg}
        backgroundColor="$line"
        borderRadius={radius.pill}
      />
    </YStack>
  );
}

function Scale({ labels, loading }: { labels: readonly string[]; loading?: boolean | undefined }) {
  return (
    <XStack
      position="absolute"
      bottom={space.xs}
      width="100%"
      justifyContent={labels.length > 1 ? "space-between" : "center"}
      gap={space.xs}
      aria-hidden={loading || undefined}
    >
      {labels.map((label, index) => (
        <YStack key={index} flexShrink={1}>
          {loading ? (
            <YStack width={space.xl} height={space.sm} backgroundColor="$line" borderRadius={radius.sm} />
          ) : (
            <KitText part={null} role="caption" tone="muted" align="center">
              {label}
            </KitText>
          )}
        </YStack>
      ))}
    </XStack>
  );
}

/** A display-only, normalized dial; the caller supplies all readings and phase copy. */
export function KitDialGauge({ part = "root", scaleLabels = [], ...props }: DialProps) {
  return (
    <YStack {...usePart(part)} alignItems="center" aria-busy={props.loading || undefined}>
      <YStack width={box} maxWidth="100%" aspectRatio={1} alignItems="center" justifyContent="center">
        <DialArc {...props} />
        {props.loading ? <ReadingPlaceholder /> : <Reading {...props} />}
        {scaleLabels.length > 0 && <Scale labels={scaleLabels} loading={props.loading} />}
      </YStack>
    </YStack>
  );
}
