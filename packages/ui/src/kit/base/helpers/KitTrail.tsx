import { Check, ChevronRight } from "@tamagui/lucide-icons";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { KitText } from "../KitText";

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

/** The end of a row: chevron (goes somewhere), check (done), switch (on/off), value or badge. */
export function KitTrail({
  kind,
  value,
  on = false,
  part = "trail",
}: {
  kind: TrailKind;
  value?: string | undefined;
  on?: boolean;
  part?: string;
}) {
  const address = usePart(part);
  if (kind === "none") return null;
  if (kind === "toggle") {
    return (
      <Frame {...address} accessibilityRole="switch" aria-checked={on}>
        <Track on={on}>
          <Knob on={on} />
        </Track>
      </Frame>
    );
  }
  if (kind === "value" || kind === "badge") {
    const text = (
      <KitText
        role={kind === "badge" ? "label" : "number"}
        numberScale="compact"
        tabular
        tone={kind === "badge" ? "accent" : "text"}
        part={null}
      >
        {value ?? ""}
      </KitText>
    );
    return <Frame {...address}>{kind === "badge" ? <Badge>{text}</Badge> : text}</Frame>;
  }
  return (
    <Frame {...address} aria-hidden>
      {kind === "chevron" && <ChevronRight size={size.icon.md} color="$muted" />}
      {kind === "check" && <Check size={size.icon.md} color="$accent" />}
    </Frame>
  );
}
