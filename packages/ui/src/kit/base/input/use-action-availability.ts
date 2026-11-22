import { useLayoutEffect, useState } from "react";
import { motion } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { useKit } from "../../provider";
import { useComponentState, usePartContext, usePartDisabled } from "../../part";

export function useActionAvailability(
  address: string,
  part: string | null,
  action: string | undefined,
  disabled: boolean,
) {
  const { interactive, controller } = useKit();
  const { component: id, item } = usePartContext();
  const hostPart = part !== null && controller?.hasHostCommandsAt(id, part, item !== undefined) === true;
  useLayoutEffect(
    () => (disabled && hostPart ? controller?.registerDisabledPart(address) : undefined),
    [address, controller, disabled, hostPart],
  );
  const offered =
    interactive &&
    controller &&
    (action
      ? controller.actionsAt(address, { ignoreDisabledPart: hostPart }).includes(action)
      : controller.canPress(address, { ignoreDisabledPart: hostPart }));
  const blocked = usePartDisabled(part === null ? undefined : address);
  const loading = useComponentState() === "loading" && !offered;
  return {
    loading,
    inactive: loading || disabled || blocked || Boolean(interactive && controller && !offered),
  };
}

export function usePressMotion(inactive: boolean) {
  const { environment, interactive } = useKit();
  const [pressed, setPressed] = useState(false);
  const still = environment.reduceMotion || environment.agentMode;
  const scale = useAnimatedValue(pressed && !still ? motion.pressScale : 1, still);
  return interactive && !inactive
    ? { scale, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) }
    : { scale };
}
