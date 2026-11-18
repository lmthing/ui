import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type IconName } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { KitIcon } from "./KitIcon";
import { KitText } from "./KitText";
import { shifted } from "./style";

function Option({
  title,
  sub,
  icon,
  value,
  badge,
  on,
  multi,
  look,
}: {
  title: string;
  sub?: string | undefined;
  icon?: IconName | undefined;
  value?: string | undefined;
  badge?: string | undefined;
  on: boolean;
  multi: boolean;
  look: "cards" | "list";
}) {
  const ks = useKitStyle();
  const address = usePart();
  const kit = useKit();
  const card = look === "cards";
  return (
    <XStack
      {...address}
      alignItems="center"
      gap={space.md}
      minHeight={size.control.lg}
      paddingVertical={space.md}
      paddingHorizontal={space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(card
        ? {
            borderWidth: on ? component.base.strongBorder : component.base.borderWidth,
            borderColor: on ? "$accent" : "$line",
            backgroundColor: on ? "$accentSoft" : "$surface",
          }
        : {})}
      accessibilityRole={multi ? "checkbox" : "radio"}
      {...(kit.interactive && kit.controller ? { onPress: () => kit.controller!.press(address.testID) } : {})}
      aria-checked={on}
      accessibilityLabel={title}
    >
      {!card && (
        <YStack
          width={size.icon.md}
          height={size.icon.md}
          borderRadius={multi ? shifted("sm", ks.radiusShift) : radius.pill}
          borderWidth={component.base.strongBorder}
          borderColor={on ? "$accent" : "$muted"}
          backgroundColor={on ? "$accent" : "transparent"}
          alignItems="center"
          justifyContent="center"
          aria-hidden
        >
          {on && <KitIcon name="check" tone="onAccent" scale="sm" decorative />}
        </YStack>
      )}
      {icon && <KitIcon name={icon} tone={on ? "accent" : "muted"} scale="lg" part="icon" />}
      <YStack flex={1} gap={space.xs}>
        <XStack gap={space.sm} alignItems="center" flexWrap="wrap">
          <KitText role="heading" part="title">
            {title}
          </KitText>
          {badge && (
            <KitText role="caption" tone="accent" part="badge">
              {badge}
            </KitText>
          )}
        </XStack>
        {sub && (
          <KitText role="body" tone="muted" part="sub">
            {sub}
          </KitText>
        )}
      </YStack>
      {value && (
        <KitText role="number" numberScale="compact" tabular part="value">
          {value}
        </KitText>
      )}
      {card && on && <KitIcon name="check" tone="accent" scale="md" decorative />}
    </XStack>
  );
}

/**
 * One choosable option: a card (`cards`, a ring and a tick when chosen) or a row with a radio or tick box
 * (`list`). The whole option is the item's root part and carries the role (radio, or checkbox when several
 * may be chosen); title, sub, value and badge are its text parts.
 */
export function KitOption({ item, ...props }: { item: string } & Parameters<typeof Option>[0]) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Option {...props} />
    </PartContext.Provider>
  );
}
