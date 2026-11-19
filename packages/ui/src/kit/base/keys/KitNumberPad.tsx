import { useId } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { formatAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KitText } from "../text";
import { PadKey, type Key } from "./PadKey";
import { useKeypadTarget } from "./use-keypad-target";

type Target = { item?: string; part: string };
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

function keyFor(keys: readonly Key[], key?: string) {
  return keys.find(
    ({ value, disabled }) =>
      !disabled &&
      typeof value === "object" &&
      ("append" in value ? value.append === key : "backspace" in value && key === "Backspace"),
  );
}

function PadGrid({
  keys,
  label,
  loading,
  disabled,
  targetPart,
  display,
  occupied,
}: Pick<NumberPadProps, "keys" | "label"> & {
  loading: boolean;
  disabled: boolean;
  targetPart: string;
  display: { id: string; value: string } | undefined;
  occupied: readonly string[];
}) {
  const kit = useKit();
  const context = usePartContext();
  const addressed = display !== undefined && !loading;
  const address = useKeypadTarget(targetPart, addressed, disabled);
  const editable = kit.interactive && kit.controller && !disabled;
  const onKeyDown = (event: { key?: string; preventDefault(): void }) => {
    const hit = keyFor(keys, event.key);
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
            "aria-label": label,
            ...(isWeb
              ? { role: "textbox" as never, "aria-describedby": display.id }
              : { accessibilityValue: { text: display.value } }),
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
  const displayId = useId();
  const split = displayPart !== undefined;
  const targetContext = target.item === undefined ? context : { ...context, item: target.item };
  const displayContext = split ? context : targetContext;
  const valuePart = displayPart ?? target.part;
  const display = formatAddress({ ...displayContext, part: valuePart });
  const destination = formatAddress({ ...targetContext, part: target.part });
  const occupied = [...(loading ? [] : [display]), ...(split ? [destination] : [])];
  const address = usePart(part, !occupied.includes(formatAddress({ ...context, part })));
  const stampRoot = !occupied.includes(address.testID);
  if (stampRoot) occupied.push(address.testID);
  const labelAddress = formatAddress({ ...context, part: "label" });
  const stampLabel = !loading && !occupied.includes(labelAddress);
  if (stampLabel) occupied.push(labelAddress);
  const grid = { keys, label, loading, disabled, occupied, targetPart: target.part };
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
          {...(split && !loading ? { id: displayId } : {})}
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
        <PadGrid {...grid} display={split ? { id: displayId, value } : undefined} />
      </PartContext.Provider>
    </YStack>
  );
}
