import { createContext, createElement, useContext, type ReactNode } from "react";
import { isWeb } from "tamagui";
import { component, parseAddress } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

export type Target = { item?: string; part: string };
const ValidTarget = createContext(false);
export const planningFocus = {
  outlineColor: "$accent",
  outlineStyle: "solid",
  outlineWidth: component.base.strongBorder,
} as const;

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

export function usePlanningAddress(target: Target | undefined, loading: boolean, register = true) {
  const enabled = useContext(ValidTarget) && Boolean(target) && !loading;
  const address = usePart(target?.part, enabled && register);
  return enabled ? address : undefined;
}

export function planningButtonEvents(press: (() => void) | undefined) {
  return press
    ? {
        cursor: "pointer" as const,
        onPress: (event: { stopPropagation?(): void }) => {
          event.stopPropagation?.();
          press();
        },
        onKeyDown: (event: { key?: string; preventDefault(): void; stopPropagation(): void }) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          press();
        },
      }
    : {};
}

export function planningNativeChoices(
  action: string,
  values: readonly string[],
  label: (value: string) => string,
  choose: (value: string) => void,
) {
  const actions = values.map((value, index) => ({ name: `${action}_${index}`, label: label(value) }));
  return {
    accessibilityActions: actions,
    onAccessibilityAction: ({ nativeEvent }: { nativeEvent: { actionName: string } }) => {
      const value = values[actions.findIndex(({ name }) => name === nativeEvent.actionName)];
      if (value !== undefined) choose(value);
    },
  };
}

type Address = ReturnType<typeof usePlanningAddress>;
export function usePlanningPress(address: Address, label: string, selected?: boolean) {
  const kit = useKit();
  if (!address) return {} as { testID?: never };
  const press =
    kit.interactive && kit.controller ? () => void kit.controller!.press(address.testID) : undefined;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(isWeb
      ? { "aria-pressed": selected }
      : { accessible: true, accessibilityState: { selected }, onAccessibilityTap: press }),
    focusable: Boolean(press),
    ...planningButtonEvents(press),
  };
}

export function usePlanningTarget(target: Target | undefined, label: string, loading: boolean) {
  return usePlanningPress(usePlanningAddress(target, loading), label);
}
