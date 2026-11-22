import { useEffect } from "react";
import { isWeb } from "tamagui";
import { useKit } from "../../../provider";

export function useTileBuzz(address: string, timed: boolean, disabled: boolean) {
  const { controller, interactive } = useKit();
  useEffect(
    () => (timed && disabled ? controller?.registerDisabledPart(address) : undefined),
    [address, controller, disabled, timed],
  );
  if (!timed || disabled || !controller || !interactive) return {};
  const buzz = () => controller.act({ address, action: "press" });
  return isWeb
    ? {
        onPointerDown: (event: PointerEvent) => {
          if (event.button === 0) buzz();
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!event.repeat) buzz();
        },
        // Assistive activation can send a click without a preceding pointer event.
        onClick: (event: MouseEvent) => {
          if (event.detail === 0) buzz();
        },
      }
    : {
        onTouchStart: buzz,
        onAccessibilityTap: buzz,
        accessibilityActions: [{ name: "activate" }],
        onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
          if (event.nativeEvent.actionName === "activate") buzz();
        },
      };
}
