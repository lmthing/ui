import { XStack, YStack, useThemeName } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useKit } from "../../provider";
import { usePart } from "../../part";
import { KitText } from "../text";
import { shifted } from "../text";
import { useKitStyle } from "../../provider";

type MarkColor = "$bg" | "$text";
function Corner({ top, left, color }: { top: boolean; left: boolean; color: MarkColor }) {
  const edge = component.base.strongBorder * 1.5;
  return (
    <YStack
      position="absolute"
      {...(top ? { top: 0 } : { bottom: 0 })}
      {...(left ? { left: 0 } : { right: 0 })}
      width={space.lg}
      height={space.lg}
      borderColor={color}
      {...(top ? { borderTopWidth: edge } : { borderBottomWidth: edge })}
      {...(left ? { borderLeftWidth: edge } : { borderRightWidth: edge })}
    />
  );
}

function ViewfinderMarks({ kind, color }: { kind: "photo" | "scan"; color: MarkColor }) {
  const third = (index: number) => `${(index * 100) / 3}%` as const;
  return kind === "photo" ? (
    [1, 2].flatMap((i) => [
      <YStack
        key={`v${i}`}
        position="absolute"
        left={third(i)}
        top={0}
        bottom={0}
        width={component.base.borderWidth}
        backgroundColor={color}
        opacity={component.base.gridOpacity}
        aria-hidden
      />,
      <YStack
        key={`h${i}`}
        position="absolute"
        top={third(i)}
        left={0}
        right={0}
        height={component.base.borderWidth}
        backgroundColor={color}
        opacity={component.base.gridOpacity}
        aria-hidden
      />,
    ])
  ) : (
    <YStack width="55%" aspectRatio={1} aria-hidden>
      <Corner top left color={color} />
      <Corner top left={false} color={color} />
      <Corner top={false} left color={color} />
      <Corner top={false} left={false} color={color} />
    </YStack>
  );
}

/**
 * A camera viewfinder: a dark rounded frame (photo: a soft rule-of-thirds grid; scan: a centred square
 * with corner marks) with the hint over its bottom edge. The frame is the part (default `viewfinder`);
 * the hint text is its own part (default `hint`).
 */
export function KitViewfinder({
  kind,
  hint,
  part = "viewfinder",
  hintPart = "hint",
}: {
  kind: "photo" | "scan";
  hint: string;
  part?: string;
  hintPart?: string;
}) {
  // A viewfinder is dark in both modes: the text colour in light mode, the screen background in dark.
  const dark = useThemeName().includes("dark");
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      aspectRatio={component.base.tallRatio}
      borderRadius={shifted("md", useKitStyle().radiusShift)}
      overflow="hidden"
      backgroundColor={dark ? "$bg" : "$text"}
      alignItems="center"
      justifyContent="center"
    >
      <ViewfinderMarks kind={kind} color={dark ? "$text" : "$bg"} />
      <XStack position="absolute" left={0} right={0} bottom={0} padding={space.md} justifyContent="center">
        <YStack
          backgroundColor="$surface"
          borderRadius={radius.pill}
          paddingHorizontal={space.md}
          paddingVertical={space.xs}
        >
          <KitText role="label" part={hintPart} align="center">
            {hint}
          </KitText>
        </YStack>
      </XStack>
    </YStack>
  );
}

/** A large round shutter button, centred: the part (default `shutter`), role button, named by `label`. */
export function KitShutter({ label, part = "shutter" }: { label: string; part?: string }) {
  const kit = useKit();
  const address = usePart(part);
  return (
    <XStack justifyContent="center" paddingVertical={space.md}>
      <YStack
        {...address}
        width={size.control.lg + space.lg}
        height={size.control.lg + space.lg}
        borderRadius={radius.pill}
        borderWidth={component.base.strongBorder * 2}
        borderColor="$accent"
        alignItems="center"
        justifyContent="center"
        accessibilityRole="button"
        accessibilityLabel={label}
        {...(kit.interactive ? { onPress: () => kit.onLink?.("shutter", address.testID) } : {})}
      >
        <YStack
          width={size.control.lg}
          height={size.control.lg}
          borderRadius={radius.pill}
          backgroundColor="$accent"
          aria-hidden
        />
      </YStack>
    </XStack>
  );
}
