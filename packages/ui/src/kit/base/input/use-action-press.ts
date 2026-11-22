import { useState } from "react";
import { motion } from "../../../catalog";
import { useActionPress as useActionDispatch } from "../../interact";
import { useAnimatedValue } from "../../motion";
import { useKit } from "../../provider";
import type { ComponentProps } from "react";
import type { KitAction } from "./KitAction";

type ActionProps = Pick<ComponentProps<typeof KitAction>, "action" | "value" | "goto">;

export function useActionPress(
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
