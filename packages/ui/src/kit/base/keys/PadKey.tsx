import { YStack, isWeb } from "tamagui";
import { component, radius, size, space, type KeypadEdit } from "../../../catalog";
import { usePart } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import { sendKeypadEdit } from "./use-keypad-target";

export type Key = { id: string; label: string; sublabel?: string; value: KeypadEdit; disabled?: boolean };
const finishes = {
  plain: { fill: "$raised", tone: "text", line: "$line" },
  accent: { fill: "$accentSoft", tone: "text", line: "$line" },
  primary: { fill: "$accent", tone: "onAccent", line: "$accent" },
  correct: { fill: "$goodSoft", tone: "text", line: "$good" },
  present: { fill: "$warnSoft", tone: "text", line: "$warn" },
  absent: { fill: "$surface", tone: "muted", line: "$line" },
} as const;
export type KeyFinish = keyof typeof finishes;

function keyHandlers(press: (() => void) | undefined, inactive: boolean, disabled: boolean) {
  if (!press || inactive) return { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled } } : {}) };
  if (!isWeb) return { onPress: press, accessible: true };
  return {
    onPress: press,
    tabIndex: 0,
    cursor: "pointer" as const,
    onKeyDown: (event: { key?: string; preventDefault(): void; stopPropagation?(): void }) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation?.();
      press();
    },
  };
}

export function KeyButton({
  label,
  glyph = label,
  sublabel,
  loading,
  disabled,
  press,
  finish = "plain",
  round = false,
  address,
}: {
  label: string;
  glyph?: string;
  sublabel?: string | undefined;
  loading: boolean;
  disabled: boolean;
  press?: (() => void) | undefined;
  finish?: KeyFinish;
  round?: boolean | undefined;
  address?: ReturnType<typeof usePart> | undefined;
}) {
  const ks = useKitStyle();
  const { fill, tone, line } = finishes[disabled ? "absent" : finish];
  return (
    <YStack
      {...address}
      minHeight={round ? size.control.md : size.control.lg}
      minWidth={size.control.md}
      paddingHorizontal={space.sm}
      paddingVertical={space.sm}
      alignItems="center"
      justifyContent="center"
      borderRadius={round ? radius.pill : shifted("md", ks.radiusShift)}
      backgroundColor={loading ? "$line" : fill}
      borderWidth={component.base.borderWidth}
      borderColor={loading ? "$line" : line}
      accessibilityRole={loading ? undefined : "button"}
      accessibilityLabel={loading ? undefined : sublabel ? `${label} ${sublabel}` : label}
      aria-disabled={disabled || undefined}
      aria-hidden={loading || undefined}
      {...keyHandlers(press, loading || disabled, disabled)}
    >
      <YStack
        alignItems={sublabel ? "center" : undefined}
        gap={sublabel ? space.xs : undefined}
        opacity={loading ? component.base.none : undefined}
        aria-hidden={loading || undefined}
      >
        <KitText role="number" numberScale="compact" tone={tone} part={null}>
          {glyph}
        </KitText>
        {sublabel && (
          <KitText role="caption" tone={tone} part={null}>
            {sublabel}
          </KitText>
        )}
      </YStack>
    </YStack>
  );
}

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
  const kit = useKit();
  const address = usePart("root", addressed);
  const unavailable = disabled || Boolean(keyValue.disabled);
  const press =
    kit.interactive && kit.controller
      ? () => sendKeypadEdit(kit.controller, target, keyValue.value)
      : undefined;
  return (
    <YStack {...(addressed ? address : {})} width={`${100 / 3}%`} padding={space.xs}>
      <KeyButton
        label={keyValue.label}
        sublabel={keyValue.sublabel}
        loading={loading}
        disabled={unavailable}
        press={press}
      />
    </YStack>
  );
}
