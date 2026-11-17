import { YStack, styled } from "tamagui";
import { component, radius, size, space } from "../../../catalog";

const Frame = styled(YStack, {
  height: size.control.lg, backgroundColor: "$accentSoft", borderRadius: radius.md,
  margin: space.sm, opacity: component.List.skeletonOpacity,
});
export function KitSkeleton() {
  return <Frame accessibilityLabel="Loading list" />;
}
