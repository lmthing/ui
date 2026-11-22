import { useLayoutEffect, useSyncExternalStore } from "react";
import { isWeb } from "tamagui";
import { formatAddress } from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";

const subscribeNone = () => () => {};

/** Read the local view state for a host-authenticated KitAction press in the current part scope. */
export function useAuthenticatedReveal(part: string) {
  const { screen, component, item } = usePartContext();
  const { controller, interactive } = useKit();
  const address = formatAddress({ screen, component, ...(item ? { item } : {}), part });
  return useSyncExternalStore(
    controller?.subscribeReveal ?? subscribeNone,
    () => (interactive ? controller?.revealStatus(address) : undefined) ?? "unavailable",
    () => "unavailable" as const,
  );
}

/** KitAction press dispatch, including equivalent web keyboard activation for reveal controls. */
export function useActionPress(
  { action, value, goto }: { action?: string | undefined; value?: unknown; goto?: string | undefined },
  address: string,
  inactive: boolean,
  reveal: boolean,
) {
  const { interactive, controller, onLink } = useKit();
  if (!interactive || inactive) return {};
  if (!controller) return goto && action !== "copy" ? { onPress: () => onLink?.(goto, address) } : {};
  const onPress = () =>
    action
      ? controller.act({ address, action, ...(value === undefined || action === "copy" ? {} : { value }) })
      : controller.press(address);
  if (!isWeb || (!reveal && !controller.mediaKeyTarget?.(address))) return { onPress };
  return {
    onPress,
    tabIndex: 0,
    onKeyDown: (event: {
      key?: string;
      repeat?: boolean;
      preventDefault(): void;
      stopPropagation(): void;
    }) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onPress();
    },
  };
}

/** Disabled reveal buttons close the controller gate as well as removing their handlers. */
export function useRevealControl(address: string, action: string | undefined, disabled: boolean) {
  const { controller, interactive } = useKit();
  const reveal = interactive && (!action || action === "press") && controller?.isRevealControl?.(address);
  useLayoutEffect(
    () => (reveal && disabled ? controller?.registerDisabledPart(address) : undefined),
    [address, controller, disabled, reveal],
  );
  return Boolean(reveal);
}
