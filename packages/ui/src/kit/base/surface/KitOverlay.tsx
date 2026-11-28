import { useLayoutEffect, useRef, type ReactNode } from "react";
import { isWeb, ScrollView, YStack, type TamaguiElement } from "tamagui";
import { useKit } from "../../provider";
import { component, motionProfiles, zIndex } from "../../../catalog";
import { useReveal } from "../../motion";
import { announceMotionSettled } from "../../part";

function modalTargets(panel: HTMLElement | null) {
  return Array.from(panel?.querySelectorAll<HTMLElement>("button, input, [tabindex], a[href]") ?? []).filter(
    (target) =>
      target.tabIndex >= 0 &&
      !target.closest('[inert], [hidden], [disabled], [aria-hidden="true"], [aria-disabled="true"]'),
  );
}

function useModalFocus(onDismiss: () => void, returnTo: string | undefined) {
  const { nativeHost } = useKit();
  const panel = useRef<TamaguiElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useLayoutEffect(() => {
    const restore = nativeHost?.focusModal?.(panel.current);
    const unsubscribeBack = nativeHost?.listenBack?.(() => dismiss.current());
    if (typeof document === "undefined")
      return () => {
        unsubscribeBack?.();
        if (typeof restore === "function") restore();
      };
    const node = panel.current as HTMLElement | null;
    const sourceRoot = node?.closest("[data-kit-screen]");
    const addressed =
      returnTo && sourceRoot?.querySelector<HTMLElement>(`[data-testid="${CSS.escape(returnTo)}"]`);
    const before = addressed || (document.activeElement as HTMLElement | null);
    (modalTargets(node)[0] ?? node)?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss.current();
      }
      if (event.key === "Tab") {
        const targets = modalTargets(node);
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) {
          event.preventDefault();
        } else if (event.shiftKey && document.activeElement === first) {
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
      queueMicrotask(() => {
        if (document.activeElement === document.body && before?.isConnected)
          before.focus({ preventScroll: true });
      });
      unsubscribeBack?.();
      if (typeof restore === "function") restore();
    };
  }, [returnTo, nativeHost]);
  return panel;
}

/** A modal inside its screen, with keyboard focus contained and restored when dismissed. */
export function KitOverlay({
  children,
  label,
  returnTo,
  onDismiss,
}: {
  children: ReactNode;
  label: string;
  returnTo?: string;
  onDismiss(): void;
}) {
  const { environment, motion } = useKit();
  const panel = useModalFocus(onDismiss, returnTo);
  const profile = motionProfiles[motion];
  const still = environment.agentMode || environment.reduceMotion;
  const progress = useReveal("open", !still, {
    spring: profile.spring,
    done: () => {
      if (isWeb && panel.current) announceMotionSettled(panel.current as HTMLElement);
    },
  });
  return (
    <YStack
      position="absolute"
      top={0}
      bottom={environment.keyboardHeight}
      left={0}
      right={0}
      justifyContent="flex-end"
      zIndex={zIndex.overlay}
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
      <YStack
        ref={panel}
        role="dialog"
        aria-modal
        aria-label={label}
        maxHeight="90%"
        {...(isWeb ? { tabIndex: -1 } : {})}
        y={still ? 0 : profile.sheet * (1 - progress)}
      >
        <ScrollView>{children}</ScrollView>
      </YStack>
    </YStack>
  );
}
