import { useControlValue } from "../../interact";
import { Input, XStack, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { KitText } from "../text";
import { KitIcon } from "../text";
import { shifted } from "../text";

type InputProps = {
  hint: string;
  value?: string | undefined;
  kind?: "text" | "search" | "number" | "date" | "time";
  icon?: IconName | undefined;
  part?: string;
  label?: string;
};

function TextControl({
  address,
  hint,
  value,
  kind = "text",
  label,
}: InputProps & {
  address: ReturnType<typeof usePart>;
}) {
  const kit = useKit();
  const ks = useKitStyle();
  const stored = useControlValue(address.testID, value ?? "");
  const draft = useControlValue<string | undefined>(`${address.testID}/$draft`, undefined);
  const current = draft ?? stored;
  return (
    <Input
      {...(address as Record<string, unknown>)}
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
      editable={kit.interactive}
      onFocus={() => kit.nativeHost?.ensureVisible?.(address.ref.current)}
      {...(kit.interactive && kit.controller
        ? {
            onChangeText: (text: string) => {
              kit.controller!.edit(address.testID, text);
            },
            value: current,
          }
        : value === undefined
          ? {}
          : { value })}
      {...({
        type: kind === "search" ? "search" : kind === "date" || kind === "time" ? kind : "text",
        inputMode: kind === "number" ? "decimal" : undefined,
        keyboardType: kind === "number" ? "decimal-pad" : "default",
      } as object)}
    />
  );
}

/**
 * A one-line text box (role textbox, or searchbox for `kind="search"`): optional leading icon, a hint
 * shown as placeholder, at least 44px tall. The box is the part (default `field`) that `type` acts on.
 * Read-only unless the host is interactive.
 */
export function KitInput({ hint, value, kind = "text", icon, part = "field", label }: InputProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const error = useControlValue<string | undefined>(`${address.testID}/$error`, undefined);
  return (
    <YStack>
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
        <TextControl
          address={address}
          hint={hint}
          value={value}
          kind={kind}
          {...(label === undefined ? {} : { label })}
        />
      </XStack>
      {error && (
        <KitText role="caption" tone="bad" part={null}>
          {error}
        </KitText>
      )}
    </YStack>
  );
}
