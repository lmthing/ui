import { Check, ChevronRight } from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { KitText } from "../index";

const Frame = styled(YStack, {
  minWidth: size.icon.md,
  alignItems: "center",
  justifyContent: "center",
  variants: {
    kind: {
      none: {},
      chevron: {},
      check: {},
      value: {},
      badge: {
        backgroundColor: "$accentSoft",
        paddingHorizontal: space.sm,
        paddingVertical: space.xs,
        borderRadius: radius.pill,
      },
      toggle: {
        width: size.control.md,
        height: size.icon.lg,
        borderRadius: radius.pill,
        backgroundColor: "$accentSoft",
      },
    },
  } as const,
});
export function KitTrail({
  kind,
  value,
  part = "trail",
}: {
  kind: "none" | "chevron" | "check" | "toggle" | "value" | "badge";
  value?: string | undefined;
  part?: string;
}) {
  const address = usePart(part);
  const hasText = (kind === "value" || kind === "badge") && value;
  return (
    <Frame {...(hasText ? {} : address)} kind={kind}>
      {kind === "chevron" && <ChevronRight size={size.icon.sm} color="$muted" aria-hidden />}
      {(kind === "check" || kind === "toggle") && <Check size={size.icon.sm} color="$accent" aria-hidden />}
      {(kind === "value" || kind === "badge") && value && (
        <KitText role="label" tone="accent" part={part}>
          {value}
        </KitText>
      )}
    </Frame>
  );
}
