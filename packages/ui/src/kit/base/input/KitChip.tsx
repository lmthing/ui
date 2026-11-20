import { createContext, useContext, type ReactNode } from "react";
import { Line, Svg } from "react-native-svg";
import { XStack, YStack, isWeb, styled, useTheme } from "tamagui";
import { component, radius, size, space, type IconName, type Swatch } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted } from "../text";
// The 44px touch area carries the role; the visible pill or segment sits inside it.
const Hit = styled(YStack, { minHeight: size.control.md, justifyContent: "center" });
const ChoiceTarget = createContext<string | undefined>(undefined);
const diagonal = { x1: "0%", y1: "100%", x2: "100%", y2: "0%" };
type ChipProps = {
  label: string;
  on: boolean;
  /** Stable choice value for an unstamped chip, independent of the display label. */
  value?: string;
  role: "checkbox" | "radio" | "tab";
  icon?: IconName | undefined;
  look?: "pill" | "segment" | "box" | undefined;
  disabled?: boolean | undefined;
  swatch?: Swatch;
  /** Named control under this item; null leaves it unaddressed and inert. */
  part?: string | null;
  labelPart?: string | null; // Null leaves caller-owned group labels untouched.
  swatchPart?: string; // Opt-in address for a stamped chip's swatch dot.
  dimSwatch?: boolean; // Defaults to dimming the dot of a disabled chip.
};
function ChipContent(props: ChipProps & { stamped: boolean; loading: boolean }) {
  const { label, on, icon, look, stamped, disabled, swatch, loading, labelPart = "label" } = props;
  const ks = useKitStyle();
  const segment = look === "segment";
  const box = look === "box";
  const custom = box || Boolean(swatch) || disabled;
  const edge = disabled ? "$line" : on ? "$accent" : "$muted";
  const idleFill = disabled ? "$raised" : "$surface";
  const onFill = segment ? "$surface" : "$accent";
  const fill = custom ? (on ? "$accentSoft" : idleFill) : on ? onFill : "transparent";
  const tone =
    !loading && !disabled && segment && !on
      ? "muted"
      : !loading && on && !custom && !segment
        ? "onAccent"
        : "text";
  const labelProps = { role: "label", tone, part: stamped ? labelPart : null, lines: 1 } as const;
  const text = <KitText {...labelProps}>{label}</KitText>;
  const slashed = disabled && !loading;
  const labelLayer = loading
    ? { opacity: component.base.none, ...(isWeb ? { style: { visibility: "hidden" } as never } : {}) }
    : slashed
      ? { position: "relative" as const }
      : undefined;
  return (
    <XStack
      alignItems="center"
      justifyContent={segment || custom ? "center" : undefined}
      gap={!segment || custom ? space.xs : undefined}
      minWidth={custom ? size.control.md : undefined}
      minHeight={segment ? size.control.sm : size.control.md}
      paddingHorizontal={box || segment ? space.sm : space.md}
      borderRadius={box || segment ? shifted("sm", ks.radiusShift) : radius.pill}
      borderWidth={
        custom ? component.base.strongBorder : segment && !on ? undefined : component.base.borderWidth
      }
      borderColor={segment && !custom && !on ? undefined : loading || (segment && !custom) ? "$line" : edge}
      backgroundColor={loading ? "$line" : fill}
      overflow={slashed ? "hidden" : undefined}
    >
      {slashed && <DisabledSlash />}
      {swatch && <SwatchMark {...props} swatch={swatch} />}
      {icon &&
        !segment &&
        (loading ? (
          <YStack width={size.icon.sm} />
        ) : (
          <KitIcon name={icon} tone={tone === "text" ? "muted" : tone} scale="sm" />
        ))}
      {labelLayer ? (
        <YStack {...labelLayer}>
          {slashed && <YStack fullscreen backgroundColor={fill} aria-hidden />}
          {slashed ? <YStack position="relative">{text}</YStack> : text}
        </YStack>
      ) : (
        text
      )}
    </XStack>
  );
}
function DisabledSlash() {
  const theme = useTheme();
  return (
    <YStack fullscreen pointerEvents="none" aria-hidden>
      <Svg width="100%" height="100%">
        <Line {...diagonal} stroke={theme.line?.val} strokeWidth={component.base.borderWidth} />
      </Svg>
    </YStack>
  );
}
function SwatchMark(props: ChipProps & { swatch: Swatch; loading: boolean; stamped: boolean }) {
  const { swatch, loading, disabled, dimSwatch, stamped, swatchPart } = props;
  const part = stamped ? swatchPart : undefined;
  const address = usePart(part, Boolean(part));
  return (
    <YStack
      {...(part ? address : {})}
      width={size.icon.sm}
      height={size.icon.sm}
      borderRadius={radius.pill}
      borderWidth={component.base.borderWidth}
      borderColor={loading ? "$line" : component.swatchBorder}
      backgroundColor={loading ? "$line" : component.swatch[swatch]}
      opacity={!loading && disabled && dimSwatch !== false ? component.base.disabledOpacity : undefined}
      aria-hidden
    />
  );
}
function Chip(input: ChipProps & { stamped: boolean }) {
  const { label, value = label, on, role, look, stamped, part = "root", disabled, ...props } = input;
  const variant = look === "box" || disabled !== undefined || Boolean(props.swatch);
  const loading = useComponentState() === "loading" && variant;
  const addressed = stamped && part !== null && !loading;
  const address = usePart(part ?? "root", addressed);
  const kit = useKit();
  const parent = useContext(ChoiceTarget);
  const target = part === null ? undefined : stamped ? address.testID : parent;
  const press =
    kit.interactive && kit.controller && target && !disabled && !loading
      ? () =>
          stamped
            ? kit.controller!.press(target)
            : kit.controller!.act({ address: target, action: "select", value })
      : undefined;
  return (
    <Hit
      {...(addressed ? address : {})}
      {...(look === "segment" ? { flex: component.base.bodyFlex } : {})}
      paddingHorizontal={look === "segment" && variant ? space.xs : undefined}
      {...(disabled && !isWeb ? { accessibilityState: { disabled: true } } : {})}
      {...(press ? { onPress: press } : {})}
      aria-hidden={loading || undefined}
      aria-disabled={(!loading && disabled) || undefined}
      accessibilityRole={loading ? undefined : role}
      aria-checked={loading || role === "tab" ? undefined : on}
      aria-selected={!loading && role === "tab" ? on : undefined}
      accessibilityLabel={loading ? undefined : label}
    >
      <ChipContent
        {...{ ...props, label, on, role, look, disabled, loading }}
        stamped={stamped && !loading}
      />
    </Hit>
  );
}
/** One selectable pill, segment or box. Pass `item: null` for a track-owned control. */
export function KitChip({ item, look = "pill", ...props }: ChipProps & { item: string | null }) {
  const context = usePartContext();
  if (item === null) return <Chip {...props} look={look} stamped={false} />;
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Chip {...props} look={look} stamped />
    </PartContext.Provider>
  );
}
export function KitTrack({
  look = "pills",
  part = "root",
  role,
  label,
  children,
}: {
  look?: "pills" | "segments";
  /** The track's own part: `root` (default), or `field` when the whole track is one choice control. */
  part?: string;
  /** `radiogroup` when the track itself is the selectable control (a Field of kind choice). */
  role?: "radiogroup";
  label?: string;
  children: ReactNode;
}) {
  const ks = useKitStyle();
  const address = usePart(part);
  const segments = look === "segments";
  return (
    <XStack
      {...address}
      {...(segments
        ? {
            backgroundColor: "$raised",
            borderRadius: shifted("md", ks.radiusShift),
            paddingHorizontal: space.xs,
          }
        : { flexWrap: "wrap" as const, columnGap: space.sm, rowGap: space.sm })}
      {...({ role: role ?? (segments ? "tablist" : "group") } as object)}
      {...(label ? { "aria-label": label } : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>{children}</ChoiceTarget.Provider>
    </XStack>
  );
}
