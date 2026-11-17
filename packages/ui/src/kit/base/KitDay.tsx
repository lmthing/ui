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
  return (
    <YStack
      {...usePart()}
      width={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={selected ? "$accent" : "transparent"}
      accessibilityRole="button"
      aria-pressed={selected}
      accessibilityLabel={name}
      {...(kit.interactive ? { cursor: "pointer" } : {})}
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
        aria-hidden
      />
    </YStack>
  );
}

/**
 * One selectable day of a calendar: a 44px round target (role button, `select`), its number, an accent
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
      borderColor={done ? "$accent" : "$line"}
      backgroundColor={done ? "$accent" : "transparent"}
      aria-hidden
    />
  );
}
