import { Check } from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { component, radius, size } from "../../../catalog";
import { usePart } from "../../part";

const Hit = styled(YStack, {
  width: size.control.md,
  height: size.control.md,
  alignItems: "center",
  justifyContent: "center",
});

const Box = styled(YStack, {
  width: size.icon.lg,
  height: size.icon.lg,
  borderRadius: radius.sm,
  borderWidth: component.base.strongBorder,
  alignItems: "center",
  justifyContent: "center",
  variants: {
    done: {
      true: { backgroundColor: "$accent", borderColor: "$accent" },
      false: { backgroundColor: "transparent", borderColor: "$muted" },
    },
  } as const,
});

/**
 * A tick box: a 24px box inside a 44px touch area, filled with a check when done. The touch area
 * is the part (default `check`) and carries the checkbox role.
 */
export function KitCheck({ done, part = "check", label }: { done: boolean; part?: string; label?: string }) {
  return (
    <Hit {...usePart(part)} accessibilityRole="checkbox" aria-checked={done} aria-label={label}>
      <Box done={done}>{done && <Check size={size.icon.sm} color="$onAccent" aria-hidden />}</Box>
    </Hit>
  );
}
