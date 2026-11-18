import { XStack, YStack } from "tamagui";
import { component, loadingLabel, size, space } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { shifted } from "../text";
import { Bar } from "./skeleton-shapes";
import { SkeletonContent, SkeletonText, linesOf, type ShapeProps } from "./skeleton-content";

export function SkeletonOptions({ items = [], question, look = "cards" }: ShapeProps) {
  const ks = useKitStyle();
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm}>
      {question && <SkeletonText text={question} role="heading" />}
      {items.map((item, index) => (
        <XStack
          key={index}
          alignItems="center"
          gap={space.md}
          minHeight={size.control.lg}
          padding={space.md}
          borderRadius={shifted("md", ks.radiusShift)}
          {...(look === "cards"
            ? {
                borderWidth: item.on ? component.base.strongBorder : component.base.borderWidth,
                borderColor: "$line",
                backgroundColor: "$surface",
              }
            : {})}
        >
          {look === "list" && <Bar width={size.icon.md} height={size.icon.md} borderRadius={size.icon.md} />}
          {item.icon && <Bar width={size.icon.lg} height={size.icon.lg} />}
          <YStack flex={1}>
            <SkeletonContent lines={linesOf(item, true)} />
          </YStack>
          {look === "cards" && item.on && <Bar width={size.icon.md} height={size.icon.md} />}
        </XStack>
      ))}
    </YStack>
  );
}
