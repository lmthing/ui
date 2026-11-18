import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";

type OptionProps = {
  title: string;
  sub?: string | undefined;
  icon?: IconName | undefined;
  value?: string | undefined;
  badge?: string | undefined;
  on: boolean;
  multi: boolean;
  look: "cards" | "list";
  /** Reserve the leading icon column across all options when any option has an icon. */
  reserveIcon?: boolean;
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
function OptionHeader({ title, icon, value, on, multi, look, reserveIcon }: OptionProps) {
  return (
    <XStack gap={space.md} alignItems="flex-start">
      {(reserveIcon || icon) && (
        <YStack width={size.icon.lg} height={typography.body.lineHeight} justifyContent="center">
          {icon && <KitIcon name={icon} tone={on ? "accent" : "muted"} scale="lg" part="icon" />}
        </YStack>
      )}
      <YStack flex={1}>
        <KitText role="body" part="title">
          {title}
        </KitText>
      </YStack>
      <XStack gap={space.sm} height={typography.body.lineHeight} alignItems="center">
        {value && (
          <KitText role="number" numberScale="compact" tabular part="value" lines={1}>
            {value}
          </KitText>
        )}
        {look === "list" ? (
          <OptionMark multi={multi} on={on} />
        ) : on ? (
          <KitIcon name="check" tone="accent" scale="md" decorative />
        ) : null}
      </XStack>
    </XStack>
  );
}
function OptionOutline() {
  const ks = useKitStyle();
  return (
    <YStack
      position="absolute"
      top={component.base.none}
      bottom={component.base.none}
      left={component.base.none}
      right={component.base.none}
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.strongBorder}
      borderColor="$accent"
      pointerEvents="none"
      aria-hidden
    />
  );
}
function Option(props: OptionProps) {
  const { title, icon, badge, sub, on, multi, look, reserveIcon } = props;
  const ks = useKitStyle();
  const address = usePart();
  const kit = useKit();
  const card = look === "cards";
  return (
    <YStack
      {...address}
      gap={component.base.none}
      minHeight={size.control.md}
      paddingVertical={space[ks.density.rowPad]}
      paddingHorizontal={space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(card ? surfaceOf(ks.surface) : {})}
      {...(card && on ? { backgroundColor: "$accentSoft" } : {})}
      accessibilityRole={multi ? "checkbox" : "radio"}
      {...(kit.interactive && kit.controller ? { onPress: () => kit.controller!.press(address.testID) } : {})}
      aria-checked={on}
      accessibilityLabel={title}
    >
      <OptionHeader {...props} />
      {(badge || sub) && (
        <YStack
          gap={space.xs}
          paddingLeft={reserveIcon || icon ? component.base.optionLead : component.base.none}
        >
          {badge && (
            <KitText role="caption" tone="accent" part="badge">
              {badge}
            </KitText>
          )}
          {sub && (
            <KitText role="caption" tone="muted" part="sub">
              {sub}
            </KitText>
          )}
        </YStack>
      )}
      {card && on && <OptionOutline />}
    </YStack>
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
