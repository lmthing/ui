import { XStack, YStack } from "tamagui";
import { component, formatAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type Target = { item?: string; part: string };
type Key = { id: string; label: string; value: string; disabled?: boolean };
type NumberPadProps = {
  part?: string;
  loading?: boolean;
  value: string;
  label: string;
  keys: readonly Key[];
  target: Target;
  disabled?: boolean;
};

function PadKey({
  keyValue,
  loading,
  disabled,
  target,
}: {
  keyValue: Key;
  loading: boolean;
  disabled: boolean;
  target: string;
}) {
  const kit = useKit(),
    ks = useKitStyle();
  const address = usePart("root", !loading);
  const unavailable = disabled || Boolean(keyValue.disabled);
  const press = () => kit.controller?.act({ address: target, action: "type", value: keyValue.value });
  return (
    <YStack {...(loading ? {} : address)} width={`${100 / 3}%`} padding={space.xs}>
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
        {...(unavailable || loading ? { tabIndex: -1, accessibilityState: { disabled: true } } : {})}
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
        <YStack {...(loading ? { visibility: "hidden" as const } : {})}>
          <KitText role="number" numberScale="compact" tone={unavailable ? "muted" : "text"} part={null}>
            {keyValue.label}
          </KitText>
        </YStack>
      </YStack>
    </YStack>
  );
}

/** Caller-supplied keypad keys dispatch their values to one addressed type control. */
export function KitNumberPad({
  part = "root",
  loading = false,
  value,
  label,
  keys,
  target,
  disabled = false,
}: NumberPadProps) {
  const context = usePartContext();
  const address = usePart(part);
  const destination = formatAddress({
    screen: context.screen,
    component: context.component,
    ...(target.item === undefined ? (context.item ? { item: context.item } : {}) : { item: target.item }),
    part: target.part,
  });
  return (
    <YStack {...address} gap={space.md} aria-busy={loading || undefined} aria-label={label}>
      <YStack gap={space.xs} aria-hidden={loading || undefined}>
        <KitText role="label" tone="muted" part={loading ? null : "label"}>
          {loading ? "\u2007".repeat(label.length) : label}
        </KitText>
        <YStack
          minHeight={size.control.lg}
          justifyContent="center"
          backgroundColor={loading ? "$line" : undefined}
        >
          <KitText role="number" tabular part={loading ? null : target.part}>
            {loading ? "\u2007".repeat(value.length) : value || "\u2007"}
          </KitText>
        </YStack>
      </YStack>
      <XStack flexWrap="wrap" margin={-space.xs}>
        {keys.map((keyValue) => (
          <PartContext.Provider key={keyValue.id} value={{ ...context, item: keyValue.id }}>
            <PadKey {...{ keyValue, loading, disabled, target: destination }} />
          </PartContext.Provider>
        ))}
      </XStack>
    </YStack>
  );
}
