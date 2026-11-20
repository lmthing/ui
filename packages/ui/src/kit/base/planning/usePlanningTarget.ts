import { createContext, createElement, useContext, type ReactNode } from "react";
import { isWeb } from "tamagui";
import { parseAddress } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

export type Target = { item?: string; part: string };
const ValidTarget = createContext(false);

export function PlanningTargetScope({
  id,
  target,
  children,
}: {
  id: string;
  target?: Target | undefined;
  children: ReactNode;
}) {
  const context = usePartContext();
  const item = target?.item ?? id;
  const valid = Boolean(
    target && parseAddress(`${context.screen}/${context.component}/${item}/${target.part}`)?.item === item,
  );
  return createElement(
    PartContext.Provider,
    { value: valid ? { ...context, item } : context },
    createElement(ValidTarget.Provider, { value: valid }, children),
  );
}

export function usePlanningTarget(
  target: Target | undefined,
  label: string,
  loading: boolean,
  selected?: boolean,
) {
  const kit = useKit();
  const enabled = useContext(ValidTarget) && !loading;
  const address = usePart(enabled ? target?.part : undefined, enabled);
  if (!enabled) return { testID: undefined };
  const press = kit.interactive && kit.controller ? () => kit.controller!.press(address.testID) : undefined;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(isWeb
      ? { "aria-pressed": selected }
      : { accessible: true, accessibilityState: { selected }, onAccessibilityTap: press }),
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
