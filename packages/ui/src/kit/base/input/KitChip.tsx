import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Line, Svg } from "react-native-svg";
import { ScrollView, XStack, YStack, isWeb, styled, useTheme, type TamaguiElement } from "tamagui";
import {
  component,
  radius,
  size,
  space,
  type as typography,
  type IconName,
  type Swatch,
} from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
import { NativeClipFrames, useNativeClipFrame, useNativeScrollFrames } from "../../report";
import { KitIcon, KitText, shifted, useTextStep, type TextTone } from "../text";
import { segmentColumns } from "./segment-fit";
// The 44×44px touch area carries the role; the visible pill or segment sits inside it.
const Hit = styled(YStack, {
  minHeight: size.control.md,
  minWidth: size.control.md,
  justifyContent: "center",
});
const ChoiceTarget = createContext<string | undefined>(undefined);
type Fit = "equal" | "pills" | number;
const SegmentFit = createContext<Fit>("equal");
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
  roving?: boolean;
  focusable?: boolean;
};
type ChipContentProps = ChipProps & {
  stamped: boolean;
  loading: boolean;
  segmentLabel: boolean;
  reportClipping: string | undefined;
};
function ChipContent(props: ChipContentProps) {
  const { on, icon, look, disabled, swatch, loading } = props;
  const ks = useKitStyle();
  const segment = look === "segment";
  const box = look === "box";
  const custom = box || Boolean(swatch) || disabled;
  const edge = !disabled && on ? "$accent" : "$line";
  const idleFill = disabled ? "$raised" : "$surface";
  const onFill = segment ? "$surface" : "$accent";
  const fill = custom ? (on ? "$accentSoft" : idleFill) : on ? onFill : "transparent";
  const tone =
    !loading && !disabled && segment && !on
      ? "muted"
      : !loading && on && !custom && !segment
        ? "onAccent"
        : "text";
  const slashed = disabled && !loading;
  const clipRef = useRef<TamaguiElement>(null);
  const clip = useNativeClipFrame(Boolean(slashed), clipRef);
  return (
    <XStack
      alignItems="center"
      justifyContent="center"
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
      {...(clip.tracking ? { ref: clipRef, onLayout: clip.onLayout, collapsable: false } : {})}
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
      <NativeClipFrames.Provider value={clip.frames}>
        <ChipLabel {...props} tone={tone} fill={fill} />
      </NativeClipFrames.Provider>
    </XStack>
  );
}

function ChipLabel(props: ChipContentProps & { tone: TextTone; fill: string }) {
  const {
    label,
    stamped,
    labelPart = "label",
    disabled,
    loading,
    segmentLabel,
    reportClipping,
    tone,
    fill,
  } = props;
  const part = stamped ? labelPart : null;
  const labelProps = {
    role: "label",
    tone,
    part,
    ...(segmentLabel ? { align: "center" as const, breakLongWords: true } : { lines: 1 }),
    reportClipping: loading ? undefined : reportClipping,
  } as const;
  const text = <KitText {...labelProps}>{label}</KitText>;
  const slashed = disabled && !loading;
  const layer = loading
    ? { opacity: component.base.none, ...(isWeb ? { style: { visibility: "hidden" } as never } : {}) }
    : slashed
      ? { position: "relative" as const }
      : undefined;
  return layer || segmentLabel ? (
    <YStack {...layer} flexShrink={segmentLabel ? component.base.bodyFlex : undefined}>
      {slashed && <YStack fullscreen backgroundColor={fill} aria-hidden />}
      {slashed ? <YStack position="relative">{text}</YStack> : text}
    </YStack>
  ) : (
    text
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
function activateByKey(press: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) press();
  };
}

function Chip(input: ChipProps & { stamped: boolean }) {
  const { label, value = label, on, role, look, stamped, part = "root" } = input;
  const { disabled, roving, focusable } = input;
  const variant = look === "box" || disabled !== undefined || Boolean(input.swatch);
  const loading = useComponentState() === "loading" && variant;
  const addressed = stamped && part !== null && !loading;
  const address = usePart(part ?? "root", addressed);
  const kit = useKit();
  const parent = useContext(ChoiceTarget);
  const fit = useContext(SegmentFit);
  const segment = look === "segment";
  const draw = segment && fit === "pills" ? "pill" : look;
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
      {...(draw === "segment" ? segmentFlex(fit) : segment ? { maxWidth: "100%" as const } : {})}
      paddingHorizontal={draw === "segment" && variant ? space.xs : undefined}
      {...(disabled && !isWeb ? { accessibilityState: { disabled: true } } : {})}
      {...(press ? { onPress: press } : {})}
      {...(isWeb && press && roving !== undefined ? ({ onKeyDown: activateByKey(press) } as object) : {})}
      {...(isWeb && press && roving ? { tabIndex: on || focusable ? 0 : -1 } : {})}
      aria-hidden={loading || undefined}
      aria-disabled={(!loading && disabled) || undefined}
      accessibilityRole={loading ? undefined : role}
      aria-checked={loading || role === "tab" ? undefined : on}
      aria-selected={!loading && role === "tab" ? on : undefined}
      accessibilityLabel={loading ? undefined : label}
    >
      <ChipContent
        {...input}
        look={draw}
        loading={loading}
        stamped={stamped && !loading}
        segmentLabel={segment}
        reportClipping={parent && !stamped ? parent : parent || segment ? address.testID : undefined}
      />
    </Hit>
  );
}

function segmentFlex(fit: Fit) {
  return typeof fit === "number"
    ? { flexBasis: `${100 / fit}%` as const, flexShrink: component.base.none, maxWidth: "100%" as const }
    : { flex: component.base.bodyFlex, flexBasis: component.base.none, maxWidth: "100%" as const };
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

function trackKey(event: KeyboardEvent<HTMLElement>) {
  const { key, currentTarget, target } = event;
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
  const choices = Array.from(
    currentTarget.querySelectorAll<HTMLElement>('[role="tab"], [role="radio"]'),
  ).filter((option) => option.getAttribute("aria-disabled") !== "true");
  const at = choices.indexOf(target as HTMLElement);
  if (at < 0) return;
  const delta = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const next =
    key === "Home" ? 0 : key === "End" ? choices.length - 1 : (at + delta + choices.length) % choices.length;
  event.preventDefault();
  choices[next]?.focus();
  choices[next]?.click();
}

type TrackProps = {
  look?: "pills" | "segments";
  /** The track's own part: `root` (default), or `field` when the whole track is one choice control. */
  part?: string;
  role?: "radiogroup";
  label?: string;
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  /** A choice field uses pills instead of segmented rows when equal slots are too narrow. */
  wrapAsPills?: boolean;
};

function useSegmentFit(children: ReactNode, segments: boolean, wrapAsPills: boolean) {
  const [width, setWidth] = useState<number>();
  const fontSize = typography[useTextStep({})("label")].size;
  const chips = segments ? Children.toArray(children) : [];
  const labels = chips.flatMap((node) => {
    if (!isValidElement<ChipProps>(node) || node.type !== KitChip || node.props.look !== "segment") return [];
    const { label, swatch, disabled } = node.props;
    return [{ label, custom: Boolean(swatch) || disabled !== undefined }];
  });
  const direct = labels.length > 0 && labels.length === chips.length;
  const columns = direct ? segmentColumns(width, fontSize, labels) : labels.length;
  const fit: Fit = columns === labels.length ? "equal" : wrapAsPills ? "pills" : columns;
  return { fit, setWidth, direct };
}

function trackStyle(segments: boolean, wrapping: boolean, ks: ReturnType<typeof useKitStyle>) {
  return segments
    ? {
        backgroundColor: "$raised",
        borderRadius: shifted("md", ks.radiusShift),
        paddingHorizontal: space.xs,
        flexWrap: wrapping ? ("wrap" as const) : undefined,
      }
    : {
        flexWrap: wrapping ? ("wrap" as const) : ("nowrap" as const),
        columnGap: space.sm,
        rowGap: space.sm,
      };
}
export function KitTrack({
  look = "pills",
  part = "root",
  role,
  label,
  children,
  scroll,
  keyboard,
  wrapAsPills = false,
}: TrackProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const segments = look === "segments";
  const { fit, setWidth, direct } = useSegmentFit(children, segments && !scroll, wrapAsPills);
  const frames = useNativeScrollFrames("x", scroll);
  const track = (
    <XStack
      {...address}
      onLayout={
        direct
          ? (event) => {
              // Only the available width is an input. Changing rows never feeds their height back into fit.
              const width = isWeb ? (address.ref.current as HTMLElement | null)?.clientWidth : undefined;
              setWidth(width ?? event.nativeEvent.layout.width);
              address.onLayout();
            }
          : address.onLayout
      }
      {...trackStyle(segments && fit !== "pills", !scroll && (!segments || fit !== "equal"), ks)}
      {...({ role: role ?? (segments ? "tablist" : "group") } as object)}
      {...(label ? { "aria-label": label } : {})}
      {...(isWeb && keyboard ? ({ onKeyDown: trackKey } as object) : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>
        <SegmentFit.Provider value={fit}>{children}</SegmentFit.Provider>
      </ChoiceTarget.Provider>
    </XStack>
  );
  return scroll ? (
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator>
      <NativeClipFrames.Provider value={frames}>{track}</NativeClipFrames.Provider>
    </ScrollView>
  ) : (
    track
  );
}
