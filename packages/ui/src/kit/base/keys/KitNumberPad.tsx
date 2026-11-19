import { XStack, YStack, isWeb } from "tamagui";
import { component, formatAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type Target = { item?: string; part: string };
type KeyValue = string | { append: string } | { backspace: true } | { clear: true };
type Key = { id: string; label: string; value: KeyValue; disabled?: boolean };
type NumberPadProps = {
  part?: string;
  displayPart?: string;
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

function PadGrid({
  keys,
  label,
  loading,
  disabled,
  targetPart,
  split,
  occupied,
}: Pick<NumberPadProps, "keys" | "label"> & {
  loading: boolean;
  disabled: boolean;
  targetPart: string;
  split: boolean;
  occupied: readonly string[];
}) {
  const kit = useKit();
  const context = usePartContext();
  const addressed = split && !loading;
  const address = usePart(targetPart, addressed);
  const editable = kit.interactive && kit.controller && !disabled;
  const onKeyDown = (event: { key?: string; preventDefault(): void }) => {
    const hit = keys.find(
      ({ value, disabled }) =>
        !disabled &&
        typeof value === "object" &&
        ("append" in value ? value.append === event.key : "backspace" in value && event.key === "Backspace"),
    );
    if (!hit) return;
    event.preventDefault();
    kit.controller?.act({ address: address.testID, action: "type", value: hit.value });
  };
  return (
    <XStack
      flexWrap="wrap"
      margin={-space.xs}
      {...(addressed
        ? {
            ...address,
            role: "textbox" as never,
            "aria-label": label,
            "aria-disabled": disabled || undefined,
            ...(editable ? { tabIndex: 0 as const, onKeyDown } : { "aria-readonly": true }),
          }
        : {})}
    >
      {keys.map((keyValue) => (
        <PartContext.Provider key={keyValue.id} value={{ ...context, item: keyValue.id }}>
          <PadKey
            {...{ keyValue, loading, disabled }}
            target={address.testID}
            addressed={
              !loading && !occupied.includes(formatAddress({ ...context, item: keyValue.id, part: "root" }))
            }
          />
        </PartContext.Provider>
      ))}
    </XStack>
  );
}

/** Caller-supplied keypad keys dispatch their values to one addressed type control. */
export function KitNumberPad({
  part = "root",
  displayPart,
  loading = false,
  value,
  label,
  keys,
  target,
  disabled = false,
}: NumberPadProps) {
  const context = usePartContext();
  const split = displayPart !== undefined;
  const targetContext = target.item === undefined ? context : { ...context, item: target.item };
  const displayContext = split ? context : targetContext;
  const valuePart = displayPart ?? target.part;
  const display = formatAddress({ ...displayContext, part: valuePart });
  const destination = formatAddress({ ...targetContext, part: target.part });
  const occupied = [...(loading ? [] : [display]), ...(split ? [destination] : [])];
  const root = formatAddress({ ...context, part });
  const stampRoot = !occupied.includes(root);
  const address = usePart(part, stampRoot);
  if (stampRoot) occupied.push(root);
  const labelAddress = formatAddress({ ...context, part: "label" });
  const stampLabel = !loading && !occupied.includes(labelAddress);
  if (stampLabel) occupied.push(labelAddress);
  return (
    <YStack
      {...(stampRoot ? address : {})}
      gap={space.md}
      aria-busy={loading || undefined}
      aria-label={label}
    >
      <YStack gap={space.xs} aria-hidden={loading || undefined}>
        <KitText role="label" tone="muted" part={stampLabel ? "label" : null}>
          {loading ? "\u2007".repeat(label.length) : label}
        </KitText>
        <YStack
          minHeight={size.control.lg}
          justifyContent="center"
          backgroundColor={loading ? "$line" : undefined}
        >
          <PartContext.Provider value={displayContext}>
            <KitText
              role="number"
              tabular
              part={loading || (split && display === destination) ? null : valuePart}
            >
              {loading ? "\u2007".repeat(value.length) : value || "\u2007"}
            </KitText>
          </PartContext.Provider>
        </YStack>
      </YStack>
      <PartContext.Provider value={targetContext}>
        <PadGrid {...{ keys, label, loading, disabled, split, occupied }} targetPart={target.part} />
      </PartContext.Provider>
    </YStack>
  );
}
