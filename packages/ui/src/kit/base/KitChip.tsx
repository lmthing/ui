import type { ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space, type IconName } from "../../catalog";
import { useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { KitIcon } from "./KitIcon";
import { KitText } from "./KitText";
import { shifted } from "./style";

// The 44px touch area carries the role; the visible pill or segment sits inside it.
const Hit = styled(YStack, { minHeight: size.control.md, justifyContent: "center" });
const Pill = styled(XStack, {
  alignItems: "center",
  gap: space.xs,
  paddingHorizontal: space.md,
  minHeight: size.control.sm,
  borderRadius: radius.pill,
  borderWidth: component.base.borderWidth,
  variants: {
    on: {
      true: { backgroundColor: "$accent", borderColor: "$accent" },
      false: { backgroundColor: "transparent", borderColor: "$muted" },
    },
  } as const,
});

function Chip({
  label,
  on,
  role,
  icon,
  look,
}: {
  label: string;
  on: boolean;
  role: "checkbox" | "radio" | "tab";
  icon?: IconName | undefined;
  look: "pill" | "segment";
}) {
  const ks = useKitStyle();
  const part = usePart();
  const segment = look === "segment";
  return (
    <Hit
      {...part}
      {...(segment ? { flex: 1 } : {})}
      accessibilityRole={role}
      aria-checked={role === "tab" ? undefined : on}
      aria-selected={role === "tab" ? on : undefined}
      accessibilityLabel={label}
    >
      {segment ? (
        <XStack
          justifyContent="center"
          alignItems="center"
          minHeight={size.control.sm}
          paddingHorizontal={space.sm}
          borderRadius={shifted("sm", ks.radiusShift)}
          backgroundColor={on ? "$surface" : "transparent"}
          {...(on ? { borderWidth: component.base.borderWidth, borderColor: "$line" } : {})}
        >
          <KitText role="label" tone={on ? "text" : "muted"} part="label" lines={1}>
            {label}
          </KitText>
        </XStack>
      ) : (
        <Pill on={on}>
          {icon && <KitIcon name={icon} tone={on ? "onAccent" : "muted"} scale="sm" />}
          <KitText role="label" tone={on ? "onAccent" : "text"} part="label" lines={1}>
            {label}
          </KitText>
        </Pill>
      )}
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
  item: string;
  label: string;
  on: boolean;
  role: "checkbox" | "radio" | "tab";
  icon?: IconName | undefined;
  look?: "pill" | "segment";
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Chip {...props} look={look} />
    </PartContext.Provider>
  );
}

/** A row of chips that wraps (`pills`), or a tinted track of equal segments (`segments`). */
export function KitTrack({ look = "pills", children }: { look?: "pills" | "segments"; children: ReactNode }) {
  const ks = useKitStyle();
  return look === "segments" ? (
    <XStack
      {...usePart()}
      backgroundColor="$raised"
      borderRadius={shifted("md", ks.radiusShift)}
      paddingHorizontal={space.xs}
      accessibilityRole="tablist"
    >
      {children}
    </XStack>
  ) : (
    <XStack {...usePart()} flexWrap="wrap" columnGap={space.sm} accessibilityRole="list">
      {children}
    </XStack>
  );
}
