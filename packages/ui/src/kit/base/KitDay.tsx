import { useSignatureProgress } from "../motion";
import { YStack } from "tamagui";
import { component, radius, size, space } from "../../catalog";
import { useKit } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { KitText } from "./KitText";

type Tone = "neutral" | "good" | "warn" | "bad";
const dot = { neutral: "$accent", good: "$good", warn: "$warn", bad: "$bad" } as const;

function Day({
  label,
  selected,
  mark,
  name,
}: {
  label: string;
  selected: boolean;
  mark?: Tone | undefined;
  name: string;
}) {
  const kit = useKit();
  const progress = useSignatureProgress("calendar_sweep");
  const address = usePart();
  return (
    <YStack
      {...address}
      flex={1}
      minWidth={component.base.dayMinWidth}
      maxWidth={size.control.md}
      height={size.control.md}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={selected ? "$accent" : "transparent"}
      accessibilityRole="button"
      {...({ "data-dense": true } as object)}
      aria-pressed={selected}
      accessibilityLabel={name}
      {...(kit.interactive && kit.controller
        ? { cursor: "pointer", onPress: () => kit.controller!.press(address.testID) }
        : {})}
    >
      <KitText role="body" tone={selected ? "accent" : "text"} part="label" tabular>
        {label}
      </KitText>
      <YStack
        position="absolute"
        bottom={space.xs}
        width={space.xs + space.xs / 2}
        height={space.xs + space.xs / 2}
        borderRadius={radius.pill}
        backgroundColor={mark ? dot[mark] : "transparent"}
        opacity={progress >= Number(label) / 31 ? 1 : 0}
        aria-hidden
      />
    </YStack>
  );
}

/**
 * One selectable day of a calendar: a 44px tall round target (at least 40px wide, so a week fits a 320px
 * phone) (role button, `select`), its number, an accent
 * ring when selected and a small dot in the mark's tone. It is the item `item` (`<item>/root`).
 */
export function KitDay({
  item,
  ...props
}: {
  item: string;
  label: string;
  name: string;
  selected: boolean;
  mark?: Tone | undefined;
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Day {...props} />
    </PartContext.Provider>
  );
}

/** A day marker for a week strip (a streak): filled accent when done, a rule ring when not. Decorative. */
export function KitDayMark({ done }: { done: boolean }) {
  return (
    <YStack
      width={size.icon.lg}
      height={size.icon.lg}
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={done ? "$accent" : "$muted"}
      backgroundColor={done ? "$accent" : "transparent"}
      aria-hidden
    />
  );
}
