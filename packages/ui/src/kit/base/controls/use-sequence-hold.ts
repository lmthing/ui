import { useRef, useSyncExternalStore } from "react";
import { isWeb } from "tamagui";
import { formatAddress, sequenceKey } from "../../../catalog";
import { usePartContext, usePartDisabled } from "../../part";
import { useKit } from "../../provider";
import { beginSequenceHold, sequenceTransport } from "./sequence-hold";
import { useContinuousPress } from "./use-continuous-press";

export type HoldToPause = {
  part: string;
  playingLabel: string;
  pausedLabel: string;
  pauseLabel: string;
  resumeLabel: string;
};
type Key = {
  key?: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};
const noSubscribe = () => () => {};

function webActivation(tap: () => void, toggle: () => void, canToggle: boolean) {
  return {
    tabIndex: 0 as const,
    "aria-keyshortcuts": canToggle ? "P" : undefined,
    onKeyDown: (event: Key) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const pauseKey = event.key?.toLowerCase() === "p" && canToggle;
      if (!pauseKey && event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) (pauseKey ? toggle : tap)();
    },
    // Pointer/touch activation is handled by the continuous press. A semantic click has no click count.
    onPress: (event: { detail?: number }) => {
      if (event.detail === 0) tap();
    },
  };
}

function nativeActivation(toggle: () => void, status: string | undefined, label: string | undefined) {
  return {
    accessible: true,
    accessibilityValue: status ? { text: status } : {},
    accessibilityActions: label ? [{ name: "togglePlayback", label }] : [],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === "togglePlayback") toggle();
    },
  };
}

export function useSequenceHold(
  option: HoldToPause | undefined,
  address: string,
  available: { tap: boolean; hold: boolean },
  tap: () => void,
) {
  const kit = useKit();
  const { screen, component } = usePartContext();
  const controller = option && kit.interactive ? kit.controller : undefined;
  const target = option && formatAddress({ screen, component, part: option.part });
  const blocked = usePartDisabled(target);
  const transport = controller && target && !blocked ? sequenceTransport(controller, target) : undefined;
  const action = useSyncExternalStore(
    controller?.store.subscribe ?? noSubscribe,
    () => transport?.action(),
    () => undefined,
  );
  const enabled = Boolean(controller && available.hold && (action || available.tap));
  const end = useRef<ReturnType<typeof beginSequenceHold>>(undefined);
  const activate = () => {
    if (available.tap) tap();
  };
  const toggle = () => {
    if (end.current) return;
    const next = transport?.action();
    if (next) transport?.send(next);
  };
  const key = `${screen}/${component}/${sequenceKey}`;
  const events = useContinuousPress(enabled, controller, `${address}:${target ?? ""}`, {
    begin(at) {
      if (controller && target) end.current = beginSequenceHold(controller, target, key, at, activate);
    },
    end(releasedAt) {
      const finish = end.current;
      end.current = undefined;
      finish?.(releasedAt);
    },
    activate,
  });
  const status =
    action === "pause" ? option?.playingLabel : action === "play" ? option?.pausedLabel : undefined;
  const actionLabel =
    action === "pause" ? option?.pauseLabel : action === "play" ? option?.resumeLabel : undefined;
  return {
    enabled,
    status: enabled ? status : undefined,
    events: enabled
      ? {
          ...events,
          ...(isWeb
            ? webActivation(activate, toggle, Boolean(action))
            : nativeActivation(toggle, status, actionLabel)),
        }
      : {},
  };
}
