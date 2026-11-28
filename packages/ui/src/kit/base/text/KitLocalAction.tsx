import { isWeb, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { minimumTouchSize, webActivation } from "../../a11y";
import { KitText } from "./KitText";

/** A local presentation control, deliberately not an agent action address. */
export function KitLocalAction({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress(): void;
}) {
  const press = disabled ? undefined : onPress;
  return (
    <YStack
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled || undefined}
      alignItems="center"
      justifyContent="center"
      minWidth={minimumTouchSize}
      minHeight={minimumTouchSize}
      paddingHorizontal={space.sm}
      borderRadius={radius.sm}
      backgroundColor="$raised"
      {...(press ? { pressStyle: { backgroundColor: "$accentSoft" } } : {})}
      {...(isWeb && disabled ? { tabIndex: -1 } : {})}
      focusVisibleStyle={{
        outlineColor: "$accent",
        outlineStyle: "solid",
        outlineWidth: component.base.strongBorder,
      }}
      onPress={press}
      {...webActivation(press)}
    >
      <KitText part={null} role="caption" tone={disabled ? "muted" : "text"} breakLongWords>
        {label}
      </KitText>
    </YStack>
  );
}
