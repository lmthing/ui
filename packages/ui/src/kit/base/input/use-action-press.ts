import { useState } from "react";
import { motion } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { useKit } from "../../provider";
import type { ComponentProps } from "react";
import type { KitAction } from "./KitAction";

type ActionProps = Pick<ComponentProps<typeof KitAction>, "action" | "value" | "goto">;

export function useActionPress(
  props: { action: ActionProps["action"]; value: ActionProps["value"]; goto: ActionProps["goto"] },
  address: string,
  inactive: boolean,
) {
  const kit = useKit();
  const [pressed, setPressed] = useState(false);
  const still = kit.environment.reduceMotion || kit.environment.agentMode;
  const scale = useAnimatedValue(pressed && !still ? motion.pressScale : 1, still);
  if (!kit.interactive || inactive) return { scale };
  const feedback = { scale, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) };
  if (kit.controller)
    return {
      ...feedback,
      onPress: () =>
        props.action
          ? kit.controller!.act({
              address,
              action: props.action,
              ...(props.value === undefined || props.action === "copy" ? {} : { value: props.value }),
            })
          : kit.controller!.press(address),
    };
  return props.goto && props.action !== "copy"
    ? { ...feedback, onPress: () => kit.onLink?.(props.goto!, address) }
    : feedback;
}
