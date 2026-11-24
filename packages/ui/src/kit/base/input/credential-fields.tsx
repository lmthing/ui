import { useState } from "react";
import { Input, XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { usePart, usePartDisabled } from "../../part";
import { useKit, useKitStyle, useWords } from "../../provider";
import { KitInput, inputRadius } from "./KitInput";
import { useFieldFinish } from "./field-finish";
import { KitText } from "../text";

function PasswordReveal({ shown, toggle }: { shown: boolean; toggle: () => void }) {
  const { interactive } = useKit();
  const { show, hide, showLabel, hideLabel } = useWords().words.fieldPassword;
  const reveal = usePart("reveal");
  const disabled = usePartDisabled(reveal.testID);
  return (
    <XStack
      {...reveal}
      accessibilityRole="button"
      accessibilityLabel={shown ? hideLabel : showLabel}
      aria-disabled={disabled || undefined}
      minWidth={size.control.md}
      minHeight={size.control.md}
      alignItems="center"
      justifyContent="center"
      onPress={interactive && !disabled ? toggle : undefined}
    >
      <KitText part={null} role="label" tone="muted">
        {shown ? hide : show}
      </KitText>
    </XStack>
  );
}

export function PasswordField({ label }: { label: string }) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  return (
    <KitInput
      label={label}
      hint=""
      privateEntry={{ value, onChange: setValue, masked: !shown }}
      trailing={<PasswordReveal shown={shown} toggle={() => setShown((visible) => !visible)} />}
    />
  );
}

function CodeCells({ value, length, focused }: { value: string; length: number; focused: boolean }) {
  const ks = useKitStyle();
  const finish = useFieldFinish();
  const active = Math.min(value.length, length - 1);
  return (
    <XStack gap={space.xs} pointerEvents="none" aria-hidden accessibilityElementsHidden>
      {Array.from({ length }, (_, index) => (
        <YStack
          key={index}
          flex={component.base.bodyFlex}
          minHeight={size.control.md}
          alignItems="center"
          justifyContent="center"
          borderRadius={inputRadius("text", ks.radiusShift, ks.frame.corner)}
          {...finish}
          {...(focused && index === active ? { borderColor: "$accent" } : {})}
        >
          {value[index] && (
            <KitText part={null} role="body" tabular>
              {value[index]}
            </KitText>
          )}
        </YStack>
      ))}
    </XStack>
  );
}

export function CodeField({ label, length = 6 }: { label: string; length?: number | undefined }) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const { interactive, nativeHost } = useKit();
  const field = usePart("field");
  const disabled = usePartDisabled(field.testID);
  const editable = interactive && !disabled;
  const value = draft.slice(0, length);
  return (
    <YStack position="relative">
      <CodeCells {...{ value, length, focused }} />
      <Input
        {...field}
        position="absolute"
        top={component.base.none}
        left={component.base.none}
        width="100%"
        height="100%"
        unstyled
        opacity={component.base.none}
        value={value}
        aria-label={label}
        role={"textbox" as never}
        inputMode="numeric"
        keyboardType="number-pad"
        autoComplete="off"
        editable={editable}
        readOnly={!editable}
        onChangeText={editable ? (next) => setDraft(next.replace(/\D/g, "").slice(0, length)) : undefined}
        onFocus={() => {
          setFocused(true);
          nativeHost?.ensureVisible?.(field.ref.current);
        }}
        onBlur={() => setFocused(false)}
      />
    </YStack>
  );
}
