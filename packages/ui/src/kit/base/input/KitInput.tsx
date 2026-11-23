import { useControlValue } from "../../interact";
import { Input, XStack, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography, type KitStyle } from "../../../catalog";
import { useKitStyle, useVariantDensity } from "../../provider";
import { useComponentState, usePart } from "../../part";
import { KitIcon, KitText, shifted } from "../text";
import { KitLayoutText } from "../layout";
import { useInputBinding, type InputProps } from "./edit";
import { fieldFinish } from "./field-finish";

export const inputRadius = (
  kind: InputProps["kind"],
  shift: KitStyle["radiusShift"],
  corner: KitStyle["frame"]["corner"] = "md",
) => shifted(kind === "search" ? "lg" : corner, shift);

function useInputLayout({ kind, icon, inset, compact }: InputProps) {
  const spacing = useVariantDensity();
  const lead = icon ?? (kind === "search" ? "search" : undefined);
  const leadWidth = lead ? size.icon.md + space.sm : component.base.none;
  const end = compact ? space.sm : space.md;
  const start =
    inset === "avatar" ? size.avatar.md + space[spacing.gap] - leadWidth - component.base.borderWidth : end;
  return { lead, start, end, captionStart: start + leadWidth + component.base.borderWidth };
}

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
      {...((options.part !== null ? address : {}) as Record<string, unknown>)}
      flex={1}
      unstyled
      role={role as never}
      aria-label={label ?? hint}
      placeholder={hint}
      placeholderTextColor="$muted"
      color={options.inactive ? "$muted" : "$text"}
      fontFamily={fontFamilies[ks.fonts.text]}
      {...(kind === "number" && options.action === "set"
        ? { textAlign: "right", fontVariant: ["tabular-nums"] }
        : {})}
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
export function KitInput(props: InputProps) {
  const { part = "field", caption, label, kind, inactive } = props;
  const ks = useKitStyle();
  const { lead, start, end, captionStart } = useInputLayout(props);
  const loading = useComponentState() === "loading";
  const address = usePart(part ?? undefined, !loading && part !== null);
  const error = useControlValue<string | undefined>(`${address.testID}/$error`, undefined);
  const name = label ?? caption;
  return (
    <YStack aria-busy={loading || undefined} aria-hidden={loading || undefined}>
      {!!caption && (
        <YStack paddingLeft={captionStart} paddingBottom={space.xs}>
          <KitLayoutText line={{ text: caption, role: "caption", tone: "muted" }} />
        </YStack>
      )}
      <XStack
        alignItems="center"
        gap={space.sm}
        minHeight={size.control.md}
        paddingLeft={start}
        paddingRight={end}
        borderRadius={
          ks.frame.field === "ruled"
            ? component.base.none
            : inputRadius(kind, ks.radiusShift, ks.frame.corner)
        }
        {...fieldFinish(ks.frame.field, loading, inactive)}
      >
        {lead && (
          <YStack opacity={loading ? component.base.none : undefined}>
            <KitIcon name={lead} tone="muted" decorative />
          </YStack>
        )}
        <TextControl {...props} address={address} {...(name === undefined ? {} : { label: name })} />
      </XStack>
      {error && !loading && (
        <KitText role="caption" tone="bad" part={null}>
          {error}
        </KitText>
      )}
    </YStack>
  );
}
