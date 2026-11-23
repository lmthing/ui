import { useContext } from "react";
import { useKit } from "../../provider";
import { RowLabelContext } from "../../a11y";
import { useControlValue } from "../../interact";
import { Check, ChevronRight } from "@tamagui/lucide-icons";
import { XStack, YStack, isWeb, styled } from "tamagui";
import { component, radius, size, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { KitText, type TextTone } from "../text";

const Frame = styled(YStack, {
  minWidth: size.control.md,
  minHeight: size.control.md,
  alignItems: "center",
  justifyContent: "center",
});
const Badge = styled(YStack, {
  backgroundColor: "$accentSoft",
  paddingHorizontal: space.sm + space.xs / 2,
  paddingVertical: space.xs,
  borderRadius: radius.pill,
});
const Track = styled(XStack, {
  width: size.control.md,
  height: size.icon.lg + space.xs,
  borderRadius: radius.pill,
  padding: component.base.strongBorder,
  borderWidth: component.base.strongBorder,
  alignItems: "center",
  variants: {
    on: {
      true: { backgroundColor: "$accent", borderColor: "$accent", justifyContent: "flex-end" },
      false: { backgroundColor: "transparent", borderColor: "$muted", justifyContent: "flex-start" },
    },
  } as const,
});
const Knob = styled(YStack, {
  borderRadius: size.icon.lg,
  variants: {
    on: {
      true: { width: size.icon.md, height: size.icon.md, backgroundColor: "$onAccent" },
      false: {
        width: size.icon.sm,
        height: size.icon.sm,
        backgroundColor: "$muted",
        marginLeft: space.xs / 2,
      },
    },
  } as const,
});

export type TrailKind = AxisValue<"trail">;
type TrailProps = {
  kind: TrailKind;
  label?: string;
  value?: string | undefined;
  on?: boolean;
  part?: string;
  disabled?: boolean;
  tone?: TextTone | undefined;
  density?: ThemeDensity | undefined;
  /** A badge in the text column, not a reserved trailing control slot. */
  inline?: boolean;
};

function ToggleTrail({
  active,
  disabled,
  loading,
}: {
  active: boolean;
  disabled: boolean;
  loading: boolean;
}) {
  if (loading)
    return (
      <YStack
        width={size.control.md}
        height={size.icon.lg + space.xs}
        borderRadius={radius.pill}
        backgroundColor="$line"
        aria-hidden
      />
    );
  return (
    <Track on={active} {...(disabled ? { backgroundColor: "$raised", borderColor: "$muted" } : {})}>
      <Knob on={active} {...(disabled ? { backgroundColor: "$muted" } : {})} />
    </Track>
  );
}

function ValueTrail({
  kind,
  value,
  tone,
  loading,
  density,
  inline,
}: Pick<TrailProps, "kind" | "value" | "tone" | "density" | "inline"> & { loading: boolean }) {
  const text = (
    <YStack
      {...(loading
        ? { opacity: component.base.none, ...(isWeb ? { style: { visibility: "hidden" } as never } : {}) }
        : {})}
    >
      <KitText
        role={kind === "badge" ? "label" : "number"}
        numberScale="compact"
        tabular
        tone={tone ?? (kind === "badge" ? "accent" : "text")}
        density={density}
        part={null}
        {...(inline && { breakLongWords: true })}
      >
        {value ?? ""}
      </KitText>
    </YStack>
  );
  const fill =
    tone === "good" || tone === "warn" || tone === "bad"
      ? `$${tone}Soft`
      : tone === "onAccent"
        ? "$accent"
        : tone === "text" || tone === "muted"
          ? "$raised"
          : "$accentSoft";
  return kind === "badge" ? (
    <Badge backgroundColor={loading ? "$line" : fill}>{text}</Badge>
  ) : (
    <YStack position="relative" borderRadius={radius.sm}>
      {text}
      {loading && (
        <YStack
          position="absolute"
          top={component.base.none}
          left={component.base.none}
          width="100%"
          height="100%"
          backgroundColor="$line"
          borderRadius={radius.sm}
          aria-hidden
        />
      )}
    </YStack>
  );
}

/** The end of a row: chevron (goes somewhere), check (done), switch (on/off), value or badge. */
export function KitTrail(props: TrailProps) {
  const { kind, label, value, on = false, part = "trail", disabled = false, tone, density } = props;
  const address = usePart(part, kind !== "none");
  const kit = useKit();
  const rowLabel = useContext(RowLabelContext);
  const loading = useComponentState() === "loading";
  const initial = value === "on" ? true : value === "off" ? false : on;
  const stored = useControlValue<unknown>(address.testID, initial);
  const active =
    typeof stored === "boolean" ? stored : stored === "on" ? true : stored === "off" ? false : on;
  if (kind === "none") return null;
  if (kind === "toggle") {
    return (
      <Frame
        {...address}
        accessibilityRole={loading ? undefined : "switch"}
        accessibilityLabel={loading ? undefined : (label ?? rowLabel)}
        aria-checked={loading ? undefined : active}
        aria-disabled={disabled || undefined}
        aria-hidden={loading || undefined}
        aria-busy={loading || undefined}
        {...(disabled || loading
          ? { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled: true } } : {}) }
          : {})}
        {...(kit.interactive && kit.controller && !disabled && !loading
          ? {
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                kit.controller!.press(address.testID);
              },
            }
          : {})}
      >
        <ToggleTrail {...{ active, disabled, loading }} />
      </Frame>
    );
  }
  if (kind === "value" || kind === "badge") {
    if (kind === "badge" && props.inline)
      return (
        <YStack {...address} alignSelf="flex-start" maxWidth="100%" aria-hidden={loading || undefined}>
          <ValueTrail {...{ kind, value, tone, loading, density }} inline />
        </YStack>
      );
    return (
      <Frame {...address} aria-hidden={loading || undefined} aria-busy={loading || undefined}>
        <ValueTrail {...{ kind, value, tone, loading, density }} />
      </Frame>
    );
  }
  return (
    <Frame {...address} aria-hidden>
      {kind === "chevron" && <ChevronRight size={size.icon.md} color="$muted" />}
      {kind === "check" && <Check size={size.icon.md} color={tone ? `$${tone}` : "$accent"} />}
    </Frame>
  );
}
