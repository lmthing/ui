import { YStack, styled } from "tamagui";
import { component, loadingLabel, radius, size, space } from "../../../catalog";

const Bar = styled(YStack, {
  height: size.control.md,
  backgroundColor: "$accentSoft",
  borderRadius: radius.md,
  opacity: component.base.skeletonOpacity,
});

/** Loading state: `rows` grey bars in the component's shape. No text. */
export function KitSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <YStack gap={space.sm} padding={space.sm} accessibilityLabel={loadingLabel}>
      {Array.from({ length: rows }, (_, index) => (
        <Bar key={index} />
      ))}
    </YStack>
  );
}
