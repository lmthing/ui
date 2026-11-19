import { YStack, isWeb } from "tamagui";
import { component, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type KeyValue = string | { append: string } | { backspace: true } | { clear: true };
export type Key = { id: string; label: string; value: KeyValue; disabled?: boolean };

export function PadKey({
  keyValue,
  loading,
  disabled,
  target,
  addressed,
}: {
  keyValue: Key;
  loading: boolean;
  disabled: boolean;
  target: string;
  addressed: boolean;
}) {
  const kit = useKit(),
    ks = useKitStyle();
  const address = usePart("root", addressed);
  const unavailable = disabled || Boolean(keyValue.disabled);
  const press = () => kit.controller?.act({ address: target, action: "type", value: keyValue.value });
  return (
    <YStack {...(addressed ? address : {})} width={`${100 / 3}%`} padding={space.xs}>
      <YStack
        minHeight={size.control.lg}
        minWidth={size.control.md}
        paddingHorizontal={space.sm}
        paddingVertical={space.sm}
        alignItems="center"
        justifyContent="center"
        borderRadius={shifted("md", ks.radiusShift)}
        backgroundColor={loading ? "$line" : unavailable ? "$surface" : "$raised"}
        borderWidth={component.base.borderWidth}
        borderColor="$line"
        accessibilityRole={loading ? undefined : "button"}
        accessibilityLabel={loading ? undefined : keyValue.label}
        aria-disabled={unavailable || undefined}
        aria-hidden={loading || undefined}
        {...(unavailable || loading
          ? { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled: true } } : {}) }
          : {})}
        {...((kit.interactive && kit.controller && !loading && !unavailable
          ? {
              onPress: press,
              onKeyDown: (event: { key: string; preventDefault(): void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  press();
                }
              },
            }
          : {}) as object)}
      >
        <YStack {...(loading ? { opacity: component.base.none } : {})}>
          <KitText role="number" numberScale="compact" tone={unavailable ? "muted" : "text"} part={null}>
            {keyValue.label}
          </KitText>
        </YStack>
      </YStack>
    </YStack>
  );
}
