import { useControlValue } from "../../interact";
import { useState } from "react";
import { TextArea, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { shifted } from "../text";

/**
 * A text box that grows with what is written (role textbox, multiline), at least `lines` tall, with its
 * hint as placeholder. The box is the part (default `field`) that `type` acts on. Read-only in a preview.
 */
type TextAreaProps = {
  hint: string;
  value?: string | undefined;
  lines?: number;
  part?: string;
  label?: string;
  maxLength?: number;
};

export function KitTextArea({ hint, value, lines = 4, part = "field", label, maxLength }: TextAreaProps) {
  const ks = useKitStyle();
  const kit = useKit();
  const address = usePart(part);
  const current = useControlValue(address.testID, value ?? "");
  const [height, setHeight] = useState<number | undefined>();
  return (
    <YStack
      minHeight={size.control.md + typography.body.lineHeight * (lines - 1)}
      paddingHorizontal={space.md}
      paddingVertical={space.sm}
      borderRadius={shifted("md", ks.radiusShift)}
      backgroundColor="$raised"
      borderWidth={component.base.borderWidth}
      borderColor="$line"
    >
      <TextArea
        {...(address as Record<string, unknown>)}
        unstyled
        flex={1}
        role={"textbox" as never}
        aria-multiline
        aria-label={label ?? hint}
        placeholder={hint}
        {...(kit.interactive && kit.controller
          ? {
              value: current,
              onChangeText: (text: string) => {
                kit.controller!.act({ address: address.testID, action: "type", value: text });
              },
              onContentSizeChange: (event: { nativeEvent: { contentSize: { height: number } } }) =>
                setHeight(Math.min(typography.body.lineHeight * 8, event.nativeEvent.contentSize.height)),
            }
          : value === undefined
            ? {}
            : { value })}
        {...(height ? { height } : {})}
        maxLength={maxLength}
        editable={kit.interactive}
        onFocus={() => kit.nativeHost?.ensureVisible?.(address.ref.current)}
        readOnly={!kit.interactive}
        color="$text"
        placeholderTextColor="$muted"
        fontFamily={fontFamilies[ks.fonts.text]}
        fontSize={typography.body.size}
        lineHeight={typography.body.lineHeight}
      />
    </YStack>
  );
}
