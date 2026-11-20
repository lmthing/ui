import { XStack, YStack, styled } from "tamagui";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { component, pickerKey, radius, size, space, type as typography } from "../../../catalog";
import type { IconName } from "../../../catalog";
import { useControlValue } from "../../interact";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
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
type PickerProps = { title: string; choices: readonly string[]; selected?: string | undefined };
const PickerRow = styled(XStack, {
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: size.control.md,
  paddingHorizontal: space.md,
  gap: space.sm,
});
function Picker({ title, choices, selected }: PickerProps) {
  const { screen, component: instance, item } = usePartContext();
  const kit = useKit();
  const ks = useKitStyle();
  const loading = useComponentState() === "loading";
  const address = usePart("root", !loading);
  const open = useControlValue<string | undefined>(`${screen}/${instance}/${pickerKey}`, undefined);
  if (loading)
    return <PickerRow aria-hidden backgroundColor="$line" borderRadius={shifted("md", ks.radiusShift)} />;
  const enabled = kit.interactive && !!kit.controller && choices.length > 0;
  const expanded = enabled && open === item;
  const Chevron = expanded ? ChevronUp : ChevronDown;
  const label = selected ? `${title}: ${selected}` : title;
  const corners = shifted("md", ks.radiusShift);
  const choose = (value: string) => {
    const result = kit.controller!.act({ address: address.testID, action: "select", value });
    const trigger = address.ref.current;
    if (result.ok && trigger && "focus" in trigger && typeof trigger.focus === "function") trigger.focus();
  };
  return (
    <YStack gap={space.xs}>
      <PickerRow
        {...address}
        borderRadius={corners}
        backgroundColor={selected ? "$accentSoft" : "$raised"}
        accessibilityRole="button"
        aria-expanded={expanded}
        aria-disabled={!enabled || undefined}
        accessibilityLabel={label}
        {...(enabled ? { onPress: () => kit.controller!.press(address.testID) } : {})}
      >
        <KitText role="label" part={null} children={label} />
        <Chevron color="$muted" size={size.icon.sm} aria-hidden />
      </PickerRow>
      {expanded && (
        <YStack role="radiogroup" aria-label={title} borderRadius={corners} backgroundColor="$raised">
          {choices.map((label) => (
            <PickerRow
              key={label}
              accessibilityRole="radio"
              aria-checked={label === selected}
              onPress={() => choose(label)}
            >
              <KitText role="label" part={null} children={label} />
              {label === selected && <KitIcon name="check" tone="accent" scale="sm" decorative />}
            </PickerRow>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
export function KitOption({ item, ...props }: { item: string } & (OptionProps | PickerProps)) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      {"choices" in props ? <Picker {...props} /> : <Option {...props} />}
    </PartContext.Provider>
  );
}
