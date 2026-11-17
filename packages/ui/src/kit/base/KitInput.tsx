import { Input, XStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography, type IconName } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { usePart } from "../part";
import { KitIcon } from "./KitIcon";
import { shifted } from "./style";

/**
 * A one-line text box (role textbox, or searchbox for `kind="search"`): optional leading icon, a hint
 * shown as placeholder, at least 44px tall. The box is the part (default `field`) that `type` acts on.
 * Read-only unless the host is interactive.
 */
export function KitInput({
  hint,
  value,
  kind = "text",
  icon,
  part = "field",
  label,
}: {
  hint: string;
  value?: string | undefined;
  kind?: "text" | "search";
  icon?: IconName | undefined;
  part?: string;
  label?: string;
}) {
  const kit = useKit();
  const ks = useKitStyle();
  return (
    <XStack
      alignItems="center"
      gap={space.sm}
      minHeight={size.control.md}
      paddingHorizontal={space.md}
      borderRadius={shifted(kind === "search" ? "lg" : "md", ks.radiusShift)}
      backgroundColor="$raised"
      borderWidth={component.base.borderWidth}
      borderColor="$line"
    >
      {(icon ?? (kind === "search" ? "search" : undefined)) && (
        <KitIcon name={icon ?? "search"} tone="muted" decorative />
      )}
      <Input
        {...(usePart(part) as Record<string, unknown>)}
        flex={1}
        unstyled
        role={(kind === "search" ? "searchbox" : "textbox") as never}
        aria-label={label ?? hint}
        placeholder={hint}
        placeholderTextColor="$muted"
        color="$text"
        fontFamily={fontFamilies[ks.fonts.text]}
        fontSize={typography.body.size}
        lineHeight={typography.body.lineHeight}
        minHeight={size.control.md}
        readOnly={!kit.interactive}
        {...(value === undefined ? {} : { value })}
      />
    </XStack>
  );
}
