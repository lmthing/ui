import { useLayoutEffect, useMemo, useRef } from "react";
import { createScreenController, createInteractionStore, browserMediaAdapter } from "../interact";
import type { PhoneScreenProps } from "./PhoneScreen";

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
  } = props;
  const language = useRef(props.lang);
  language.current = props.lang;
  const callbacks = useRef({ onLink, onAction, resolveMedia, onChange, onSend, requestPhoto });
  callbacks.current = { onLink, onAction, resolveMedia, onChange, onSend, requestPhoto };
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(resolveMedia);
  const source = useMemo(() => {
    const committed = { deviceData: props.deviceData };
    const controller = createScreenController({
      screen,
      defs,
      get lang() {
        return language.current;
      },
      get deviceData() {
        return committed.deviceData;
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
  // Rendering gets its own snapshot from context. The published agent only sees committed data.
  useLayoutEffect(() => {
    source.committed.deviceData = props.deviceData;
  }, [source, props.deviceData]);
  return source.controller;
}
