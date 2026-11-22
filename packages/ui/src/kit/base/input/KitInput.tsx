import { useControlValue } from "../../interact";
import { Input, XStack, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { useComponentState, usePart } from "../../part";
import { KitIcon, KitText, shifted } from "../text";
import { useInputBinding, type InputProps } from "./edit";

function TextControl({
  address,
  hint,
  value,
  kind = "text",
  label,
  ...options
}: InputProps & { address: ReturnType<typeof usePart> }) {
  const ks = useKitStyle();
  const { role, loading, disabled, editable, props } = useInputBinding({
    address,
    hint,
    value,
    kind,
    ...options,
  });
  return (
    <Input
      {...(address as Record<string, unknown>)}
      flex={1}
      unstyled
      role={role as never}
      aria-label={label ?? hint}
      placeholder={hint}
      placeholderTextColor="$muted"
      color={options.inactive ? "$muted" : "$text"}
      fontFamily={fontFamilies[ks.fonts.text]}
      fontSize={typography.body.size}
      lineHeight={typography.body.lineHeight}
      minHeight={size.control.md}
      {...(options.compact ? { width: component.base.none, minWidth: size.control.md } : {})}
      readOnly={!editable}
      editable={editable}
      {...(disabled || loading ? { disabled: true } : {})}
      aria-disabled={disabled || undefined}
      {...(props as object)}
      {...(loading ? ({ opacity: component.base.none, pointerEvents: "none" } as object) : {})}
    />
  );
}

/**
 * A one-line input with textbox, searchbox, or numeric set spinbutton semantics.
 * Date set textboxes commit only complete calendar dates in YYYY-MM-DD.
 * It can show a leading icon and placeholder and is at least 44px tall (default part `field`).
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
