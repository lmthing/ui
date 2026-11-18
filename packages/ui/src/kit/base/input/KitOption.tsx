import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted } from "../text";

type OptionProps = {
  title: string;
  sub?: string | undefined;
  icon?: IconName | undefined;
  value?: string | undefined;
  badge?: string | undefined;
  on: boolean;
  multi: boolean;
  look: "cards" | "list";
};
function OptionMark({ multi, on }: Pick<OptionProps, "multi" | "on">) {
  const ks = useKitStyle();
  return (
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
  );
}
function OptionText({ title, badge, sub }: Pick<OptionProps, "title" | "badge" | "sub">) {
  return (
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
  );
}
function Option(props: OptionProps) {
  const { title, icon, value, on, multi, look } = props;
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
      {!card && <OptionMark multi={multi} on={on} />}
      {icon && <KitIcon name={icon} tone={on ? "accent" : "muted"} scale="lg" part="icon" />}
      <OptionText {...props} />
      {value && (
        <KitText role="number" numberScale="compact" tabular part="value">
          {value}
        </KitText>
      )}
      {card && on && <KitIcon name="check" tone="accent" scale="md" decorative />}
    </XStack>
  );
}

/** A card or row option, addressed as one item with title, sub, value and badge parts. */
export function KitOption({ item, ...props }: { item: string } & OptionProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Option {...props} />
    </PartContext.Provider>
  );
}
