import { useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createScreenController,
  createInteractionStore,
  browserMediaAdapter,
  type ScreenController,
} from "../interact";
import type { PhoneScreenProps } from "./PhoneScreen";

type HostSnapshot = Pick<PhoneScreenProps, "deviceData" | "hostCommands">;
function useCommittedHost(
  source: { controller: ScreenController; committed: { snapshot: HostSnapshot } },
  snapshot: HostSnapshot,
) {
  const [, refreshWithCommittedHost] = useState(snapshot);
  // Publish only on commit, before a child's layout effect can read the controller.
  useInsertionEffect(() => {
    source.committed.snapshot = snapshot;
  }, [source, snapshot]);
  useLayoutEffect(() => {
    source.controller.discardHiddenConfirmation();
    // Render-time control availability calls the controller, which just received the new snapshot.
    refreshWithCommittedHost(snapshot);
  }, [source, snapshot]);
}

export function usePhoneController(props: PhoneScreenProps) {
  const { screen, defs, interaction, interactive = true, media } = props;
  const { requestPhoto, deviceData, hostCommands, parentGate } = props;
  const callbacks = useRef(props);
  callbacks.current = props;
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(props.resolveMedia);
  const snapshot = useMemo(() => ({ deviceData, hostCommands }), [deviceData, hostCommands]);
  const source = useMemo(() => {
    const committed = { snapshot };
    const controller = createScreenController({
      screen,
      defs,
      get lang() {
        return callbacks.current.lang;
      },
      get deviceData() {
        return committed.snapshot.deviceData;
      },
      get hostCommands() {
        return committed.snapshot.hostCommands;
      },
      store,
      parentGate,
      interactive,
      requireMounted: true,
      onChange: (changed, values) => callbacks.current.onChange?.(changed, values),
      onSend: (text, address) => callbacks.current.onSend?.(text, address),
      ...(requestPhoto
        ? {
            requestPhoto: (address: string) =>
              callbacks.current.requestPhoto?.(address) ?? Promise.resolve(undefined),
          }
        : {}),
      onLink: (goto, address) => callbacks.current.onLink?.(goto, address),
      onAction: (step) => callbacks.current.onAction?.(step),
      media:
        media ??
        (hasMediaResolver
          ? browserMediaAdapter((reference) => callbacks.current.resolveMedia?.(reference))
          : undefined),
    });
    return { controller, committed };
  }, [screen, defs, media, hasMediaResolver, store, interactive, Boolean(requestPhoto), parentGate]);
  useCommittedHost(source, snapshot);
  return source.controller;
}
