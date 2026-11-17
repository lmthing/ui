import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space } from "../../catalog";
import { usePart } from "../part";
import { KitText } from "./KitText";

const Dot = styled(YStack, {
  height: space.sm,
  borderRadius: radius.pill,
  variants: {
    state: {
      done: { width: space.sm, backgroundColor: "$accent" },
      current: { width: space.lg, backgroundColor: "$accent" },
      todo: { width: space.sm, backgroundColor: "$line" },
    },
  } as const,
});
const Circle = styled(YStack, {
  width: size.icon.lg,
  height: size.icon.lg,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: component.base.strongBorder,
  variants: {
    reached: {
      true: { backgroundColor: "$accent", borderColor: "$accent" },
      false: { backgroundColor: "transparent", borderColor: "$line" },
    },
  } as const,
});
const Joint = styled(YStack, { flex: 1, height: component.base.strongBorder });

/**
 * The drawn track of a step sequence: `dots` (done and current in accent, the current a pill), `bar`
 * (a thin track filled to at/count) or `numbered` (circles joined by lines). Decorative: the track is
 * a part for layout and taps, hidden from reading and assistive tech; a label carries the meaning.
 */
export function KitStepsTrack({
  style,
  count,
  at,
  part = "track",
}: {
  style: "dots" | "bar" | "numbered";
  count: number;
  at: number;
  part?: string;
}) {
  const steps = Array.from({ length: count }, (_, index) => index + 1);
  const frame = { ...usePart(part), "aria-hidden": true, accessibilityElementsHidden: true } as const;
  if (style === "bar") {
    return (
      <XStack
        {...frame}
        height={space.sm}
        borderRadius={radius.pill}
        backgroundColor="$line"
        overflow="hidden"
      >
        <YStack width={`${(at / count) * 100}%`} backgroundColor="$accent" borderRadius={radius.pill} />
      </XStack>
    );
  }
  if (style === "dots") {
    return (
      <XStack {...frame} gap={space.xs} alignItems="center">
        {steps.map((step) => (
          <Dot key={step} state={step < at ? "done" : step === at ? "current" : "todo"} />
        ))}
      </XStack>
    );
  }
  return (
    <XStack {...frame} alignItems="center">
      {steps.map((step) => (
        <XStack key={step} alignItems="center" flex={step < count ? 1 : undefined}>
          <Circle reached={step <= at}>
            <KitText role="caption" tone={step <= at ? "onAccent" : "muted"}>
              {String(step)}
            </KitText>
          </Circle>
          {step < count && <Joint backgroundColor={step < at ? "$accent" : "$line"} />}
        </XStack>
      ))}
    </XStack>
  );
}
