import { useMemo, useRef } from "react";
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
  const callbacks = useRef({ onLink, onAction, resolveMedia, onChange, onSend, requestPhoto });
  callbacks.current = { onLink, onAction, resolveMedia, onChange, onSend, requestPhoto };
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(resolveMedia);
  const controller = useMemo(
    () =>
      createScreenController({
        screen,
        defs,
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
      }),
    [screen, defs, media, hasMediaResolver, store, interactive, Boolean(requestPhoto)],
  );
  return controller;
}
