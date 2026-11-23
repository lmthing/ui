import { YStack, useTheme } from "tamagui";
import { Svg, Circle, Path } from "react-native-svg";
import { ChevronDown } from "@tamagui/lucide-icons";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitText } from "../text";
export type WheelDrawingProps = {
  options: readonly { id: string; label: string; disabled?: boolean }[];
  at?: string | undefined;
  angle: number;
  loading: boolean;
};
const box = component.base.ringLg + size.avatar.lg;
const r = box / 2 - space.md;
const point = (a: number, distance = r) => [
  box / 2 + Math.sin(a) * distance,
  box / 2 - Math.cos(a) * distance,
];
export function OptionLabel({
  option,
  selected,
  loading,
}: {
  option: WheelDrawingProps["options"][number];
  selected: boolean;
  loading: boolean;
}) {
  const address = usePart("root", !loading);
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : address)}
      aria-current={!loading && selected ? "true" : undefined}
      accessibilityLabel={loading ? undefined : option.label}
      alignItems="center"
      justifyContent="center"
      height={typography.label.lineHeight}
      gap={space.xs}
    >
      {loading ? (
        <YStack
          width={size.icon.lg}
          height={component.base.dot}
          backgroundColor="$muted"
          borderRadius={radius.pill}
        />
      ) : (
        <KitText
          role="label"
          part={null}
          align="center"
          lines={1}
          strike={!!option.disabled}
          tone={option.disabled ? "muted" : selected ? "accent" : "text"}
        >
          {option.label}
        </KitText>
      )}
    </YStack>
  );
}

function Sector({
  option,
  index,
  count,
  angle,
  loading,
  at,
}: WheelDrawingProps & {
  option: WheelDrawingProps["options"][number];
  index: number;
  count: number;
}) {
  const theme = useTheme();
  const start = (index / count + angle) * Math.PI * 2;
  const end = ((index + 1) / count + angle) * Math.PI * 2;
  const [x, y] = point(start),
    [ex, ey] = point(end);
  return (
    <Path
      d={`M ${box / 2} ${box / 2} L ${x} ${y} A ${r} ${r} 0 0 1 ${ex} ${ey} Z`}
      fill={
        loading || option.disabled
          ? loading
            ? theme.surface?.val
            : theme.line?.val
          : at === option.id
            ? theme.accentSoft?.val
            : index % 2
              ? theme.raised?.val
              : theme.surface?.val
      }
      stroke={!loading && at === option.id ? theme.accent?.val : theme.muted?.val}
      strokeOpacity={loading ? component.base.disabledOpacity : 1}
      strokeWidth={component.base.borderWidth}
    />
  );
}

export function WheelDrawing(props: WheelDrawingProps) {
  const { options, at, angle, loading } = props;
  const theme = useTheme();
  const context = usePartContext();
  return (
    <YStack width={box} height={box} alignSelf="center">
      <YStack position="absolute" aria-hidden>
        <Svg width={box} height={box}>
          <Circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill={
              loading || options.every((option) => option.disabled)
                ? loading
                  ? theme.surface?.val
                  : theme.line?.val
                : options.length === 1 && at === options[0]?.id
                  ? theme.accentSoft?.val
                  : theme.surface?.val
            }
            stroke={theme.muted?.val}
            strokeOpacity={loading ? component.base.disabledOpacity : 1}
            strokeWidth={component.base.strongBorder}
          />
          {options.length > 1 &&
            options.map((option, i) => (
              <Sector key={option.id} {...props} option={option} index={i} count={options.length} />
            ))}
        </Svg>
      </YStack>
      {options.map((option, i) => {
        const [x, y] = point(((i + 0.5) / options.length + angle) * Math.PI * 2, r / 2);
        const width = Math.min(size.avatar.lg, (Math.PI * r) / Math.max(1, options.length));
        return (
          <YStack
            key={option.id}
            position="absolute"
            left={options.length === 1 ? box / 2 - width / 2 : x! - width / 2}
            top={options.length === 1 ? box / 2 - size.icon.md / 2 : y! - size.icon.md / 2}
            width={width}
          >
            <PartContext.Provider value={{ ...context, item: option.id }}>
              <OptionLabel option={option} selected={at === option.id} loading={loading} />
            </PartContext.Provider>
          </YStack>
        );
      })}
      <YStack position="absolute" top={component.base.none} alignSelf="center" aria-hidden>
        <ChevronDown size={size.icon.lg} color={loading ? "$muted" : "$text"} />
      </YStack>
    </YStack>
  );
}
