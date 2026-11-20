import { XStack, isWeb, styled } from "tamagui";
import { numberLine, radius, size, space } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { useKit, useWords } from "../../provider";
import { KitIcon, KitText } from "../text";

type StepperProps = {
  part: string;
  value: number;
  min?: number | undefined;
  max?: number | undefined;
  disabled?: boolean;
  labels?: { less: string; more: string };
};
type Direction = "decrement" | "increment";

const Hit = styled(XStack, {
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  minWidth: size.control.md,
  minHeight: size.control.md,
  borderRadius: radius.pill,
});

function StepButton({
  target,
  action,
  name,
  disabled,
}: {
  target: string;
  action: Direction;
  name: string;
  disabled: boolean;
}) {
  const { controller, interactive } = useKit();
  const inactive =
    disabled || Boolean(interactive && controller && !controller.actionsAt(target).includes(action));
  const act = () => {
    if (!inactive) controller?.act({ address: target, action });
  };
  return (
    <Hit
      accessibilityRole="button"
      accessibilityLabel={name}
      {...(isWeb
        ? {
            "aria-disabled": inactive || undefined,
            tabIndex: interactive && controller && !inactive ? 0 : -1,
          }
        : { accessibilityState: { disabled: inactive } })}
      backgroundColor={inactive ? "$raised" : "$accentSoft"}
      {...(controller && interactive
        ? {
            onPress: (event: { stopPropagation?(): void }) => {
              event.stopPropagation?.();
              act();
            },
            ...(isWeb && !inactive
              ? {
                  onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    act();
                  },
                }
              : {}),
          }
        : {})}
    >
      <KitIcon
        name={action === "decrement" ? "minus" : "plus"}
        tone={inactive ? "muted" : "accent"}
        decorative
      />
    </Hit>
  );
}

/** One declared part with two unaddressed human targets. Pass the current projected quantity. */
export function KitStepper({ part, value, min, max, disabled = false, labels }: StepperProps) {
  const address = usePart(part);
  const state = useComponentState();
  const { lang, words } = useWords();
  const { less, more } = labels ?? words.stepLabels;
  const inactive = disabled || state === "loading";
  return (
    <XStack {...address} alignItems="center" alignSelf="flex-start" gap={space.xs}>
      <StepButton
        target={address.testID}
        action="decrement"
        name={less}
        disabled={inactive || (min !== undefined && value <= min)}
      />
      <KitText role="number" numberScale="compact" align="center" part={null} tabular>
        {numberLine(value, lang)}
      </KitText>
      <StepButton
        target={address.testID}
        action="increment"
        name={more}
        disabled={inactive || (max !== undefined && value >= max)}
      />
    </XStack>
  );
}
