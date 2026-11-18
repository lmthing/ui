import { TextArea, YStack } from "tamagui";
import { component, fontFamilies, size, space, type as typography } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { usePart } from "../part";
import { shifted } from "./style";

/**
 * A text box that grows with what is written (role textbox, multiline), at least `lines` tall, with its
 * hint as placeholder. The box is the part (default `field`) that `type` acts on. Read-only in a preview.
 */
export function KitTextArea({
  hint,
  value,
  lines = 4,
  part = "field",
  label,
}: {
  hint: string;
  value?: string | undefined;
  lines?: number;
  part?: string;
  label?: string;
}) {
  const ks = useKitStyle();
  const kit = useKit();
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
        {...(usePart(part) as Record<string, unknown>)}
        unstyled
        flex={1}
        role={"textbox" as never}
        aria-multiline
        aria-label={label ?? hint}
        placeholder={hint}
        {...(value === undefined ? {} : { value })}
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
