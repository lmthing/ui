import { XStack, isWeb } from "tamagui";
import { component, layoutType, size, space } from "../../../catalog";
import { useActionPress } from "../../interact";
import { usePart, usePartDisabled } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

/** A stable, addressed toggle button for an optional scanner brightness lease. */
export function KitScannerToggle({
  part,
  label,
  pressed,
  disabled,
}: {
  part: string;
  label: string;
  pressed: boolean;
  disabled: boolean;
}) {
  const address = usePart(part);
  const ks = useKitStyle();
  const { controller, interactive } = useKit();
  const blocked = usePartDisabled(address.testID);
  const inactive =
    disabled || blocked || !interactive || !controller?.actionsAt(address.testID).includes("toggle");
  const press = useActionPress({ action: "toggle" }, address.testID, inactive, false);
  return (
    <XStack
      {...address}
      {...(isWeb
        ? { tag: "button", type: "button", "aria-pressed": pressed }
        : { accessibilityState: { selected: pressed, disabled: inactive } })}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={inactive || undefined}
      {...(inactive ? { tabIndex: -1 } : {})}
      alignSelf="stretch"
      alignItems="center"
      justifyContent="center"
      minHeight={size.control.md}
      paddingHorizontal={space.lg}
      borderWidth={component.base.none}
      borderRadius={shifted("md", ks.radiusShift)}
      backgroundColor={pressed ? "$accentSoft" : "transparent"}
      {...press}
    >
      <KitText role={layoutType.meta} part={`${part}_label`} tone={inactive ? "muted" : "accent"}>
        {label}
      </KitText>
    </XStack>
  );
}
