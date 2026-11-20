import { useLayoutEffect } from "react";
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
  const press = (event: { stopPropagation?(): void }) => {
    event.stopPropagation?.();
    if (!disabled) controller?.act({ address: target, action });
  };
  return (
    <Hit
      accessibilityRole="button"
      accessibilityLabel={name}
      {...(isWeb
        ? {
            "aria-disabled": disabled || undefined,
            "data-step-action": action,
            tabIndex: interactive && controller && !disabled ? 0 : -1,
          }
        : { accessibilityState: { disabled } })}
      backgroundColor={disabled ? "$raised" : "$accentSoft"}
      onPress={controller && interactive ? press : undefined}
      {...((isWeb && controller && interactive && !disabled
        ? {
            onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              press(event);
            },
          }
        : {}) as object)}
    >
      <KitIcon
        name={action === "decrement" ? "minus" : "plus"}
        tone={disabled ? "muted" : "accent"}
        decorative
      />
    </Hit>
  );
}

/** One declared part with two unaddressed human targets. Pass the current projected quantity. */
export function KitStepper({ part, value, min, max, disabled = false, labels }: StepperProps) {
  const address = usePart(part);
  const state = useComponentState();
  const { controller, interactive } = useKit();
  const { lang, words } = useWords();
  const { less, more } = labels ?? words.stepLabels;
  const floor = min !== undefined && value <= min;
  const ceiling = max !== undefined && value >= max;
  const inactive = disabled || state === "loading" || (floor && ceiling);
  useLayoutEffect(
    () => (inactive ? controller?.registerDisabledPart(address.testID) : undefined),
    [address.testID, controller, inactive],
  );
  // Ignore our own registration here so a newly enabled render sees the catalog's current actions.
  const offered = interactive
    ? controller?.actionsAt(address.testID, { ignoreDisabledPart: true })
    : undefined;
  return (
    <XStack
      {...address}
      {...(isWeb ? { accessibilityRole: "group" as const } : {})}
      alignItems="center"
      alignSelf="flex-start"
      gap={space.xs}
    >
      <StepButton
        target={address.testID}
        action="decrement"
        name={less}
        disabled={inactive || floor || offered?.includes("decrement") === false}
      />
      <KitText role="number" numberScale="compact" align="center" part={null} tabular>
        {numberLine(value, lang)}
      </KitText>
      <StepButton
        target={address.testID}
        action="increment"
        name={more}
        disabled={inactive || ceiling || offered?.includes("increment") === false}
      />
    </XStack>
  );
}
