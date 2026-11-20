import { isWeb } from "tamagui";
import { usePart } from "../../part";
import { useKit } from "../../provider";

export type Target = { item?: string; part: string };

export function usePlanningTarget(
  target: Target | undefined,
  label: string,
  loading: boolean,
  selected?: boolean,
) {
  const kit = useKit();
  const address = usePart(target?.part, Boolean(target) && !loading);
  if (!target || loading) return {};
  const press = kit.interactive && kit.controller ? () => kit.controller!.press(address.testID) : undefined;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(isWeb ? { "aria-pressed": selected } : { accessibilityState: { selected } }),
    focusable: Boolean(press),
    ...(press
      ? {
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return press();
          },
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            return press();
          },
        }
      : {}),
  };
}
