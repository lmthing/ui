import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { KitText } from "../text";

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
    state: {
      done: { backgroundColor: "$accent", borderColor: "$accent" },
      current: { backgroundColor: "$accentSoft", borderColor: "$accent" },
      todo: { backgroundColor: "transparent", borderColor: "$line" },
    },
  } as const,
});
const Joint = styled(YStack, { flex: 1, height: component.base.strongBorder });

function SegmentedTrack({
  count,
  at,
  progress,
  frame,
}: {
  count: number;
  at: number;
  progress: number;
  frame: ReturnType<typeof usePart> & { "aria-hidden": true; accessibilityElementsHidden: true };
}) {
  const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return (
    <XStack {...frame} gap={space.xs} alignSelf="stretch">
      {Array.from({ length: count }, (_, index) => {
        const step = index + 1;
        const fill = step < at ? 1 : step === at ? ratio : 0;
        return (
          <XStack
            key={step}
            flex={1}
            height={space.xs}
            borderRadius={radius.pill}
            backgroundColor="$line"
            overflow="hidden"
          >
            {fill > 0 && (
              <YStack width={`${fill * 100}%`} backgroundColor="$accent" borderRadius={radius.pill} />
            )}
          </XStack>
        );
      })}
    </XStack>
  );
}

/**
 * The drawn track of a step sequence: `dots` (done and current in accent, the current a pill), `bar`
 * (filled to at/count), `numbered` (joined circles) or `segmented` (equal bars with per-step fill).
 * Decorative: the track is a part for layout and taps, hidden from reading and assistive tech.
 */
type TrackProps = {
  style: "dots" | "bar" | "numbered" | "segmented";
  count: number;
  at: number;
  /** Current step fraction for `segmented`, where `at` is one-based. */
  progress?: number;
  part?: string;
};

export function KitStepsTrack({ style, count, at, progress = 0, part = "track" }: TrackProps) {
  const frame = { ...usePart(part), "aria-hidden": true, accessibilityElementsHidden: true } as const;
  if (style === "segmented") return <SegmentedTrack {...{ count, at, progress, frame }} />;
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
  const steps = Array.from({ length: count }, (_, index) => index + 1);
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
          <Circle state={step < at ? "done" : step === at ? "current" : "todo"}>
            <KitText
              role="caption"
              tone={step < at ? "onAccent" : step === at ? "accent" : "muted"}
              part={null}
            >
              {String(step)}
            </KitText>
          </Circle>
          {step < count && <Joint backgroundColor={step < at ? "$accent" : "$line"} />}
        </XStack>
      ))}
    </XStack>
  );
}
