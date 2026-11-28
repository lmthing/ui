import { XStack, YStack } from "tamagui";
import { component, space } from "../../../catalog";
import { useWords } from "../../provider";
import { KitIcon, KitText } from "../text";

/** A visible state that cannot be mistaken for the surface tint alone. */
export function KitStateMark({ kind }: { kind: "selected" | "warning" }) {
  const { selectedLabel, warningLabel } = useWords().words;
  const warning = kind === "warning";
  const tone = warning ? "warn" : "text";
  return (
    <XStack alignItems="center" gap={space.xs} minWidth={component.base.none} maxWidth="100%">
      <KitIcon name={warning ? "alert" : "check"} decorative scale="sm" tone={tone} />
      <YStack flexShrink={1} minWidth={component.base.none}>
        <KitText role="caption" tone={tone} part={null} breakLongWords>
          {warning ? warningLabel : selectedLabel}
        </KitText>
      </YStack>
    </XStack>
  );
}
