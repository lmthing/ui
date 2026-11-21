import { useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createScreenController,
  createInteractionStore,
  browserMediaAdapter,
  type ScreenController,
} from "../interact";
import type { PhoneScreenProps } from "./PhoneScreen";

type HostSnapshot = Pick<PhoneScreenProps, "deviceData" | "authenticateReveal">;
function useCommittedHost(
  source: { controller: ScreenController; committed: HostSnapshot },
  { deviceData, authenticateReveal }: HostSnapshot,
) {
  const [, refreshWithCommittedData] = useState(deviceData);
  const [, refreshWithCommittedReveal] = useState(() => authenticateReveal);
  // Publish only on commit, before a child's layout effect can read the controller.
  useInsertionEffect(() => {
    source.committed.deviceData = deviceData;
    source.committed.authenticateReveal = authenticateReveal;
  }, [source, deviceData, authenticateReveal]);
  useLayoutEffect(() => {
    source.controller.discardHiddenConfirmation();
    // Render-time control availability calls the controller, which just received the new snapshot.
    refreshWithCommittedData(deviceData);
    refreshWithCommittedReveal(() => authenticateReveal);
  }, [source, deviceData, authenticateReveal]);
}

export function usePhoneController(props: PhoneScreenProps) {
  const {
    screen,
    defs,
    interaction,
    interactive = true,
    media,
    resolveMedia,
    onLink,
    onAction,
    onChange,
    onSend,
    requestPhoto,
    authenticateReveal,
  } = props;
  const language = useRef(props.lang);
  language.current = props.lang;
  const callbacks = useRef({ onLink, onAction, resolveMedia, onChange, onSend, requestPhoto });
  callbacks.current = { onLink, onAction, resolveMedia, onChange, onSend, requestPhoto };
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(resolveMedia);
  const source = useMemo(() => {
    const committed: HostSnapshot = { deviceData: props.deviceData, authenticateReveal };
    const controller = createScreenController({
      screen,
      defs,
      get lang() {
        return language.current;
      },
      get deviceData() {
        return committed.deviceData;
      },
      get authenticateReveal() {
        return committed.authenticateReveal;
      },
      store,
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
  }, [screen, defs, media, hasMediaResolver, store, interactive, Boolean(requestPhoto)]);
  useCommittedHost(source, props);
  return source.controller;
}
