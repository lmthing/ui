import { createContext } from "react";
import { isWeb } from "tamagui";
import { size } from "../../catalog";

/** The visible row label, inherited by its independent controls unless they supply their own. */
export const RowLabelContext = createContext<string | undefined>(undefined);

export const minimumTouchSize = isWeb ? size.control.md : size.control.lg;

type ActivationKey = {
  key?: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  target?: unknown;
  currentTarget?: unknown;
  preventDefault(): void;
  stopPropagation?(): void;
};

/** Role-based controls need an explicit keyboard path on web; nested controls own their own keys. */
export function webActivation(
  press: (() => unknown) | undefined,
  space = true,
  feedback?: (held: boolean) => void,
) {
  if (!isWeb || !press) return {};
  const ownKey = (event: ActivationKey) =>
    event.target === event.currentTarget && (event.key === "Enter" || (space && event.key === " "));
  return {
    tabIndex: 0 as const,
    onKeyDown: (event: ActivationKey) => {
      if (!ownKey(event) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation?.();
      if (!event.repeat) {
        feedback?.(true);
        press();
      }
    },
    ...(feedback
      ? {
          onKeyUp: (event: ActivationKey) => {
            if (ownKey(event)) feedback(false);
          },
        }
      : {}),
  };
}
