import { YStack } from "tamagui";
import { component, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { shifted } from "../text";

export function FlipPlaceholder({ hint }: { hint: boolean }) {
  const ks = useKitStyle();
  const rowHeights = [
    typography.caption.lineHeight,
    typography.heading.lineHeight,
    typography.label.lineHeight,
  ];
  return (
    <YStack width="100%" maxWidth={component.base.ringLg} gap={space.xs} alignItems="center" aria-hidden>
      {(hint ? ["42%", "100%", "36%"] : ["42%", "100%"]).map((width, index) => (
        <YStack
          key={width}
          width={width}
          height={rowHeights[index]}
          marginTop={index === 2 ? space.sm : undefined}
          justifyContent="center"
        >
          <YStack
            height={index === 1 ? space.md : space.xs + component.base.strongBorder}
            borderRadius={shifted("sm", ks.radiusShift)}
            backgroundColor="$line"
          />
        </YStack>
      ))}
    </YStack>
  );
}
