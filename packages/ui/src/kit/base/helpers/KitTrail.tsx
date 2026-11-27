import { useContext } from "react";
import { useKit } from "../../provider";
import { RowLabelContext } from "../../a11y";
import { useControlValue } from "../../interact";
import { Check, ChevronRight } from "@tamagui/lucide-icons";
import { XStack, YStack, isWeb, styled } from "tamagui";
import { component, motion, radius, size, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { KitText, type TextTone } from "../text";
import { useChangeReveal, useMotionValue, useReducedFade } from "../../motion";

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
      true: { backgroundColor: "$accent", borderColor: "$accent" },
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
        width: size.icon.md,
        height: size.icon.md,
        backgroundColor: "$muted",
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
  const progress = Math.min(1, Math.max(0, useMotionValue(Number(active), disabled || loading)));
  const fade = useReducedFade(!disabled && !loading ? String(active) : undefined);
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
      <YStack width={progress * (size.control.md - size.icon.md - 4 * component.base.strongBorder)} />
      <Knob
        on={active}
        {...fade}
        scale={(size.icon.sm + (size.icon.md - size.icon.sm) * progress) / size.icon.md}
        {...(disabled ? { backgroundColor: "$muted" } : {})}
      />
    </Track>
  );
}

function badgeFill(tone?: TextTone) {
  if (tone === "good" || tone === "warn" || tone === "bad") return `$${tone}Soft` as const;
  if (tone === "text" || tone === "muted") return "$raised";
  return tone === "onAccent" ? "$accent" : "$accentSoft";
}

function ValueTrail({
  kind,
  value,
  tone,
  loading,
  density,
  inline,
}: Pick<TrailProps, "kind" | "value" | "tone" | "density" | "inline"> & { loading: boolean }) {
  const { environment } = useKit();
  const pulse = useChangeReveal(kind === "badge" && !loading ? `${tone}:${value}` : undefined);
  const pose = motion.chipDip + (1 - motion.chipDip) * pulse;
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
  return kind === "badge" ? (
    <Badge
      backgroundColor={loading ? "$line" : badgeFill(tone)}
      {...(environment.reduceMotion ? { opacity: pose } : { scale: pose })}
    >
      {text}
    </Badge>
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
