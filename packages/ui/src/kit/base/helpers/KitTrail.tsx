import { useKit } from "../../provider";
import { useControlValue } from "../../interact";
import { Check, ChevronRight } from "@tamagui/lucide-icons";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
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

export type TrailKind = "none" | "chevron" | "check" | "toggle" | "value" | "badge";
type TrailProps = {
  kind: TrailKind;
  value?: string | undefined;
  on?: boolean;
  part?: string;
  disabled?: boolean;
  tone?: TextTone;
};

function ValueTrail({
  kind,
  value,
  tone,
  loading,
}: {
  kind: TrailKind;
  value: string | undefined;
  tone: TextTone | undefined;
  loading: boolean;
}) {
  const text = (
    <YStack {...(loading ? { visibility: "hidden" as const } : {})}>
      <KitText
        role={kind === "badge" ? "label" : "number"}
        numberScale="compact"
        tabular
        tone={tone ?? (kind === "badge" ? "accent" : "text")}
        part={null}
      >
        {value ?? ""}
      </KitText>
    </YStack>
  );
  const fill =
    tone === "good" || tone === "warn" || tone === "bad"
      ? `$${tone}Soft`
      : tone === "text" || tone === "muted"
        ? "$raised"
        : "$accentSoft";
  return kind === "badge" ? (
    <Badge backgroundColor={loading ? "$line" : fill}>{text}</Badge>
  ) : (
    <YStack backgroundColor={loading ? "$line" : undefined} borderRadius={radius.sm}>
      {text}
    </YStack>
  );
}

/** The end of a row: chevron (goes somewhere), check (done), switch (on/off), value or badge. */
export function KitTrail({ kind, value, on = false, part = "trail", disabled = false, tone }: TrailProps) {
  const address = usePart(part, kind !== "none");
  const kit = useKit();
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
        aria-checked={active}
        aria-disabled={disabled || undefined}
        aria-hidden={loading || undefined}
        aria-busy={loading || undefined}
        {...(disabled || loading ? { tabIndex: -1, accessibilityState: { disabled: true } } : {})}
        {...(kit.interactive && kit.controller && !disabled && !loading
          ? {
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                kit.controller!.press(address.testID);
              },
            }
          : {})}
      >
        <Track
          on={active}
          {...(disabled || loading ? { backgroundColor: "$raised", borderColor: "$muted" } : {})}
        >
          <Knob on={active} {...(disabled || loading ? { backgroundColor: "$muted" } : {})} />
        </Track>
      </Frame>
    );
  }
  if (kind === "value" || kind === "badge") {
    return (
      <Frame {...address} aria-hidden={loading || undefined} aria-busy={loading || undefined}>
        <ValueTrail {...{ kind, value, tone, loading }} />
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
