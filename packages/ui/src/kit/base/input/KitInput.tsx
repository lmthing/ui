import { useControlValue } from "../../interact";
import { Input, XStack, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { useComponentState, usePart } from "../../part";
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
  /** Fit paired columns without reducing the addressed control's touch target. */
  compact?: boolean;
  /** Muted, unraised hours that remain editable before their day is enabled. */
  inactive?: boolean;
  action?: "type" | "set";
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

function useInputEdit(props: InputProps, address: string) {
  const kit = useKit();
  return (text: string) => {
    if (props.disabled) return;
    const numeric = props.kind === "number" && text.trim() !== "" && Number.isFinite(Number(text));
    let value = numeric ? Number(text) : text;
    if (typeof value === "number") {
      const min = props.min ?? -Infinity,
        max = props.max ?? Infinity;
      const step = props.step;
      if (step && step > 0 && Number.isFinite(step)) {
        const origin = props.min ?? 0;
        const first = Math.ceil((min - origin) / step),
          last = Math.floor((max - origin) / step);
        value = Number(
          (origin + Math.min(last, Math.max(first, Math.round((value - origin) / step))) * step).toPrecision(
            15,
          ),
        );
      }
      value = Math.min(max, Math.max(min, value));
    }
    if (props.action === "set") kit.controller?.act({ address, action: "set", value });
    else
      kit.controller?.edit(
        address,
        numeric && (props.min !== undefined || props.max !== undefined || props.step !== undefined)
          ? String(value)
          : text,
      );
  };
}

function TextControl({
  address,
  hint,
  value,
  kind = "text",
  label,
  compact = false,
  inactive = false,
  ...options
}: InputProps & {
  address: ReturnType<typeof usePart>;
}) {
  const kit = useKit();
  const ks = useKitStyle();
  const stored = useControlValue(address.testID, value ?? "");
  const draft = useControlValue<string | undefined>(`${address.testID}/$draft`, undefined);
  const loading = useComponentState() === "loading";
  const edit = useInputEdit({ hint, kind, ...options }, address.testID);
  const editable = kit.interactive && !options.disabled && !loading;
  return (
    <Input
      {...(address as Record<string, unknown>)}
      flex={1}
      unstyled
      role={(loading ? undefined : kind === "search" ? "searchbox" : "textbox") as never}
      aria-label={label ?? hint}
      placeholder={hint}
      placeholderTextColor="$muted"
      color={inactive ? "$muted" : "$text"}
      fontFamily={fontFamilies[ks.fonts.text]}
      fontSize={typography.body.size}
      lineHeight={typography.body.lineHeight}
      minHeight={size.control.md}
      {...(compact ? { width: component.base.none, minWidth: size.control.md } : {})}
      readOnly={!editable}
      editable={editable}
      {...(options.disabled || loading ? { disabled: true } : {})}
      aria-disabled={options.disabled || undefined}
      onFocus={() => kit.nativeHost?.ensureVisible?.(address.ref.current)}
      {...(editable && kit.controller
        ? {
            onChangeText: edit,
            value: draft ?? stored,
          }
        : value === undefined
          ? {}
          : { value })}
      {...({
        type: kind === "search" ? "search" : kind === "date" || kind === "time" ? kind : "text",
        inputMode: kind === "number" ? "decimal" : undefined,
        keyboardType: kind === "number" ? "decimal-pad" : "default",
        ...(options.action === "set" && kind === "number" ? { type: "number" } : {}),
        min: options.min,
        max: options.max,
        step: options.step,
      } as object)}
      {...(loading ? ({ opacity: component.base.none, pointerEvents: "none" } as object) : {})}
    />
  );
}

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
  compact = false,
  inactive = false,
  ...options
}: InputProps) {
  const ks = useKitStyle();
  const loading = useComponentState() === "loading";
  const address = usePart(part, !loading);
  const error = useControlValue<string | undefined>(`${address.testID}/$error`, undefined);
  return (
    <YStack aria-busy={loading || undefined} aria-hidden={loading || undefined}>
      <XStack
        alignItems="center"
        gap={space.sm}
        minHeight={size.control.md}
        paddingHorizontal={compact ? space.sm : space.md}
        borderRadius={shifted(kind === "search" ? "lg" : "md", ks.radiusShift)}
        backgroundColor={loading ? "$line" : inactive ? "$surface" : "$raised"}
        borderWidth={component.base.borderWidth}
        borderColor="$line"
      >
        {(icon ?? (kind === "search" ? "search" : undefined)) &&
          (loading ? (
            <YStack opacity={component.base.none}>
              <KitIcon name={icon ?? "search"} tone="muted" decorative />
            </YStack>
          ) : (
            <KitIcon name={icon ?? "search"} tone="muted" decorative />
          ))}
        <TextControl
          address={address}
          hint={hint}
          value={value}
          kind={kind}
          compact={compact}
          inactive={inactive}
          {...(label === undefined ? {} : { label })}
          {...options}
        />
      </XStack>
      {error && !loading && (
        <KitText role="caption" tone="bad" part={null}>
          {error}
        </KitText>
      )}
    </YStack>
  );
}
