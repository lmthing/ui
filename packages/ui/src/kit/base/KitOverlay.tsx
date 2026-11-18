import { useEffect, useRef, type ReactNode } from "react";
import { ScrollView, YStack, type TamaguiElement } from "tamagui";
import { useKit } from "../provider";
import { component } from "../../catalog";

/** A modal inside its screen, with keyboard focus contained and restored when dismissed. */
export function KitOverlay({
  children,
  label,
  onDismiss,
}: {
  children: ReactNode;
  label: string;
  onDismiss(): void;
}) {
  const { environment, nativeHost } = useKit();
  const panel = useRef<TamaguiElement>(null);
  useEffect(() => {
    const restore = nativeHost?.focusModal?.(panel.current);
    const unsubscribeBack = nativeHost?.listenBack?.(onDismiss);
    if (typeof document === "undefined")
      return () => {
        unsubscribeBack?.();
        if (typeof restore === "function") restore();
      };
    const before = document.activeElement as HTMLElement | null;
    const node = panel.current as HTMLElement | null;
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button, [role="button"], [role="link"], input, [tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
      if (event.key === "Tab") {
        const targets = focusable();
        const first = targets[0],
          last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      before?.focus();
      unsubscribeBack?.();
      if (typeof restore === "function") restore();
    };
  }, [onDismiss, nativeHost]);
  return (
    <YStack
      position="absolute"
      top={0}
      bottom={environment.keyboardHeight}
      left={0}
      right={0}
      justifyContent="flex-end"
      zIndex={1}
    >
      <YStack
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        backgroundColor="$text"
        opacity={component.base.skeletonOpacity}
        onPress={onDismiss}
        aria-hidden
      />
      <YStack ref={panel} role="dialog" aria-modal aria-label={label} maxHeight="90%">
        <ScrollView>{children}</ScrollView>
      </YStack>
    </YStack>
  );
}
