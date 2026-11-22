import { useState } from "react";
import { motion } from "../../../catalog";
import {
  useActionPress as useActionDispatch,
  useCopyFeedback,
  usePrivateStatusAt,
  useRevealControl,
} from "../../interact";
import { useAnimatedValue } from "../../motion";
import { usePart, usePartDisabled } from "../../part";
import { useKit } from "../../provider";
import { useSequenceHold } from "../controls";
import type { ComponentProps } from "react";
import type { KitAction } from "./KitAction";
import { useActionAvailability } from "./use-action-availability";

type ActionProps = ComponentProps<typeof KitAction>;

function useActionPress(
  props: { action: ActionProps["action"]; value: ActionProps["value"]; goto: ActionProps["goto"] },
  address: string,
  inactive: boolean,
  reveal: boolean,
) {
  const kit = useKit();
  const [pressed, setPressed] = useState(false);
  const still = kit.environment.reduceMotion || kit.environment.agentMode;
  const scale = useAnimatedValue(pressed && !still ? motion.pressScale : 1, still);
  const dispatch = useActionDispatch(props, address, inactive, reveal);
  if (!kit.interactive || inactive) return { scale };
  return { scale, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false), ...dispatch };
}

function useCopyState(address: string | undefined, value: unknown, hostCopy: boolean, disabled: boolean) {
  const local = useCopyFeedback(address, hostCopy ? undefined : value, disabled, hostCopy);
  const host = usePrivateStatusAt(hostCopy ? address : undefined, "copy");
  return {
    missing: Boolean(address && !hostCopy && (typeof value !== "string" || !value.length)),
    copied: local || host === "approved",
  };
}

export function useActionBehavior({
  goto,
  part = "root",
  action,
  value,
  disabled = false,
  hostCopy = false,
  holdToPause,
}: ActionProps) {
  const address = usePart(part ?? undefined, part !== null);
  const { loading, inactive: unavailable } = useActionAvailability(address.testID, part, action, disabled);
  const copy = action === "copy";
  const reveal = useRevealControl(address.testID, part === null ? "none" : action, disabled || loading);
  const feedback = useCopyState(
    copy && part !== null ? address.testID : undefined,
    value,
    hostCopy,
    loading || disabled,
  );
  const inactive = part === null || unavailable || feedback.missing;
  const handlers = useActionPress({ action, value, goto }, address.testID, inactive, reveal);
  const blocked = usePartDisabled(holdToPause ? address.testID : undefined);
  const hold = useSequenceHold(
    holdToPause,
    address.testID,
    { tap: !inactive, hold: part !== null && !disabled && !loading && !blocked },
    () => {
      if ("onPress" in handlers) handlers.onPress?.();
    },
  );
  return {
    address,
    loading,
    inactive: inactive && !hold.enabled,
    copy,
    copied: feedback.copied && !inactive,
    status: hold.status,
    handlers: holdToPause ? hold.events : handlers,
  };
}
