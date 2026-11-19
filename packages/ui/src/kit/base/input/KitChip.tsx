import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { XStack, YStack, isWeb, styled } from "tamagui";
import { component, radius, size, space, type IconName, type Swatch } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted } from "../text";

// The 44px touch area carries the role; the visible pill or segment sits inside it.
const Hit = styled(YStack, { minHeight: size.control.md, justifyContent: "center" });
const ChoiceTarget = createContext<string | undefined>(undefined);

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
  /** Label address; null leaves caller-owned group labels untouched. */
  labelPart?: string | null;
};

function ChipContent(props: ChipProps & { stamped: boolean; loading: boolean }) {
  const { label, on, icon, look, stamped, disabled, swatch, loading, labelPart = "label" } = props;
  const ks = useKitStyle();
  const segment = look === "segment";
  const box = look === "box";
  const custom = box || Boolean(swatch) || disabled;
  const edge = custom ? (on ? "$accent" : "$muted") : segment ? "$line" : on ? "$accent" : "$muted";
  const idleFill = disabled ? "$raised" : "$surface";
  const onFill = segment ? "$surface" : "$accent";
  const fill = custom ? (on ? "$accentSoft" : idleFill) : on ? onFill : "transparent";
  const dim = !loading && (disabled || (segment && !on));
  const accent = !loading && on && !custom && !segment;
  const tone = dim ? "muted" : accent ? "onAccent" : "text";
  const text = (
    <KitText role="label" tone={tone} part={stamped ? labelPart : null} lines={1} strike={disabled ?? false}>
      {label}
    </KitText>
  );
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
      borderColor={segment && !custom && !on ? undefined : loading ? "$line" : edge}
      backgroundColor={loading ? "$line" : fill}
    >
      {swatch && <SwatchMark swatch={swatch} loading={loading} />}
      {icon &&
        !segment &&
        (loading ? (
          <YStack width={size.icon.sm} />
        ) : (
          <KitIcon name={icon} tone={tone === "text" ? "muted" : tone} scale="sm" />
        ))}
      {loading ? (
        <YStack
          opacity={component.base.none}
          {...(isWeb ? { style: { visibility: "hidden" } as never } : {})}
        >
          {text}
        </YStack>
      ) : (
        text
      )}
    </XStack>
  );
}

function SwatchMark({ swatch, loading }: { swatch: Swatch; loading: boolean }) {
  return (
    <YStack
      width={size.icon.sm}
      height={size.icon.sm}
      borderRadius={radius.pill}
      borderWidth={component.base.borderWidth}
      borderColor={loading ? "$line" : component.swatchBorder}
      backgroundColor={loading ? "$line" : component.swatch[swatch]}
      aria-hidden
    />
  );
}

function Chip(input: ChipProps & { stamped: boolean }) {
  const { label, value = label, on, role, look, stamped, part = "root", disabled, ...props } = input;
  const state = useComponentState();
  const loading = state === "loading" && (look === "box" || disabled !== undefined || Boolean(props.swatch));
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
        {...props}
        {...{ label, on, role, look, disabled, loading }}
        stamped={stamped && !loading}
      />
    </Hit>
  );
}

/** One selectable pill, segment or box. */
export function KitChip({
  item,
  look = "pill",
  ...props
}: ChipProps & {
  /** The item id; `null` inside a track that is itself the control (no per-chip address). */
  item: string | null;
}) {
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
  return look === "segments" ? (
    <XStack
      {...address}
      backgroundColor="$raised"
      borderRadius={shifted("md", ks.radiusShift)}
      paddingHorizontal={space.xs}
      {...({ role: role ?? "tablist" } as object)}
      {...(label ? { "aria-label": label } : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>{children}</ChoiceTarget.Provider>
    </XStack>
  ) : (
    <XStack
      {...address}
      flexWrap="wrap"
      columnGap={space.sm}
      rowGap={space.sm}
      {...({ role: role ?? "list" } as object)}
      {...(label ? { "aria-label": label } : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>{children}</ChoiceTarget.Provider>
    </XStack>
  );
}
