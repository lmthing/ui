import { createContext, useContext } from "react";
import { useKit } from "../../provider";
import type { ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space, type IconName } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitText } from "../text";
import { shifted } from "../text";

// The 44px touch area carries the role; the visible pill or segment sits inside it.
const Hit = styled(YStack, { minHeight: size.control.md, justifyContent: "center" });
const Pill = styled(XStack, {
  alignItems: "center",
  gap: space.xs,
  paddingHorizontal: space.md,
  minHeight: size.control.md,
  borderRadius: radius.pill,
  borderWidth: component.base.borderWidth,
  variants: {
    on: {
      true: { backgroundColor: "$accent", borderColor: "$accent" },
      false: { backgroundColor: "transparent", borderColor: "$muted" },
    },
  } as const,
});

const ChoiceTarget = createContext<string | undefined>(undefined);

function ChipContent({
  label,
  on,
  icon,
  look,
  stamped,
}: Pick<Parameters<typeof Chip>[0], "label" | "on" | "icon" | "look" | "stamped">) {
  const ks = useKitStyle();
  if (look === "segment") {
    return (
      <XStack
        justifyContent="center"
        alignItems="center"
        minHeight={size.control.sm}
        paddingHorizontal={space.sm}
        borderRadius={shifted("sm", ks.radiusShift)}
        backgroundColor={on ? "$surface" : "transparent"}
        {...(on ? { borderWidth: component.base.borderWidth, borderColor: "$line" } : {})}
      >
        <KitText role="label" tone={on ? "text" : "muted"} part={stamped ? "label" : null} lines={1}>
          {label}
        </KitText>
      </XStack>
    );
  }
  return (
    <Pill on={on}>
      {icon && <KitIcon name={icon} tone={on ? "onAccent" : "muted"} scale="sm" />}
      <KitText role="label" tone={on ? "onAccent" : "text"} part={stamped ? "label" : null} lines={1}>
        {label}
      </KitText>
    </Pill>
  );
}

function Chip({
  label,
  on,
  role,
  icon,
  look,
  stamped,
}: {
  label: string;
  on: boolean;
  role: "checkbox" | "radio" | "tab";
  icon?: IconName | undefined;
  look: "pill" | "segment";
  stamped: boolean;
}) {
  const address = usePart("root", stamped);
  const kit = useKit();
  const parent = useContext(ChoiceTarget);
  const target = stamped ? address.testID : parent;
  const part = stamped ? address : {};
  const segment = look === "segment";
  return (
    <Hit
      {...part}
      {...(segment ? { flex: 1 } : {})}
      accessibilityRole={role}
      {...(kit.interactive && kit.controller && target
        ? {
            onPress: () =>
              stamped
                ? kit.controller!.press(target)
                : kit.controller!.act({ address: target, action: "select", value: label }),
          }
        : {})}
      aria-checked={role === "tab" ? undefined : on}
      aria-selected={role === "tab" ? on : undefined}
      accessibilityLabel={label}
    >
      <ChipContent label={label} on={on} icon={icon} look={look} stamped={stamped} />
    </Hit>
  );
}

/**
 * One selectable item: a `pill` (Chips) or a `segment` (Segmented, inside `KitTrack`). The 44px touch
 * area is the item's root part and carries `role` (checkbox for toggle, radio or tab for select).
 */
export function KitChip({
  item,
  look = "pill",
  ...props
}: {
  /** The item id; `null` inside a track that is itself the control (no per-chip address). */
  item: string | null;
  label: string;
  on: boolean;
  role: "checkbox" | "radio" | "tab";
  icon?: IconName | undefined;
  look?: "pill" | "segment";
}) {
  const context = usePartContext();
  if (item === null) return <Chip {...props} look={look} stamped={false} />;
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Chip {...props} look={look} stamped />
    </PartContext.Provider>
  );
}

/** A row of chips that wraps (`pills`), or a tinted track of equal segments (`segments`). */
export function KitTrack({
  look = "pills",
  part = "root",
  role,
  label,
  children,
}: {
  look?: "pills" | "segments";
  /** The track's own part: `root` (default), or `field` when the whole track is one choice control. */
  part?: string;
  /** `radiogroup` when the track itself is the selectable control (a Field of kind choice). */
  role?: "radiogroup";
  label?: string;
  children: ReactNode;
}) {
  const ks = useKitStyle();
  const address = usePart(part);
  return look === "segments" ? (
    <XStack
      {...address}
      backgroundColor="$raised"
      borderRadius={shifted("md", ks.radiusShift)}
      paddingHorizontal={space.xs}
      {...({ role: role ?? "tablist" } as object)}
      {...(label ? { "aria-label": label } : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>{children}</ChoiceTarget.Provider>
    </XStack>
  ) : (
    <XStack
      {...address}
      flexWrap="wrap"
      columnGap={space.sm}
      rowGap={space.sm}
      {...({ role: role ?? "list" } as object)}
      {...(label ? { "aria-label": label } : {})}
    >
      <ChoiceTarget.Provider value={address.testID}>{children}</ChoiceTarget.Provider>
    </XStack>
  );
}
