import { Check } from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { component, radius, size } from "../../../catalog";
import { usePart } from "../../part";

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
      false: { backgroundColor: "transparent", borderColor: "$line" },
    },
  } as const,
});

/** A tick box: filled with a check when done. A part (default `check`) the person can toggle. */
export function KitCheck({ done, part = "check" }: { done: boolean; part?: string }) {
  return (
    <Box {...usePart(part)} done={done} accessibilityRole="checkbox" aria-checked={done}>
      {done && <Check size={size.icon.sm} color="$onAccent" aria-hidden />}
    </Box>
  );
}
