import { useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createScreenController,
  createInteractionStore,
  browserMediaAdapter,
  type ScreenController,
} from "../interact";
import type { PhoneScreenProps } from "./PhoneScreen";

function useCommittedDeviceData(
  source: { controller: ScreenController; committed: { deviceData: PhoneScreenProps["deviceData"] } },
  deviceData: PhoneScreenProps["deviceData"],
) {
  const [, refreshWithCommittedData] = useState(deviceData);
  // Publish only on commit, before a child's layout effect can read the controller.
  useInsertionEffect(() => {
    source.committed.deviceData = deviceData;
  }, [source, deviceData]);
  useLayoutEffect(() => {
    source.controller.discardHiddenConfirmation();
    // Render-time control availability calls the controller, which just received the new snapshot.
    refreshWithCommittedData(deviceData);
  }, [source, deviceData]);
}

export function usePhoneController(props: PhoneScreenProps) {
  const { screen, defs, interaction, interactive = true, media, resolveMedia, requestPhoto } = props;
  const current = useRef(props);
  current.current = props;
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(resolveMedia);
  const source = useMemo(() => {
    const committed = { deviceData: props.deviceData };
    const controller = createScreenController({
      screen,
      defs,
      get lang() {
        return current.current.lang;
      },
      get deviceData() {
        return committed.deviceData;
      },
      store,
      interactive,
      requireMounted: true,
      ...phoneCallbacks(current),
      get attachments() {
        return current.current.attachments;
      },
      get resolvePlayback() {
        return current.current.resolvePlayback;
      },
      media:
        media ??
        (hasMediaResolver
          ? browserMediaAdapter((reference) => current.current.resolveMedia?.(reference))
          : undefined),
    });
    return { controller, committed };
  }, [
    screen,
    defs,
    media,
    Boolean(props.attachments),
    Boolean(props.resolvePlayback),
    hasMediaResolver,
    store,
    interactive,
    Boolean(requestPhoto),
  ]);
  useCommittedDeviceData(source, props.deviceData);
  return source.controller;
}

function phoneCallbacks(callbacks: {
  current: Pick<
    PhoneScreenProps,
    "onLink" | "onAction" | "resolveMedia" | "onChange" | "onSend" | "requestPhoto"
  >;
}): Pick<PhoneScreenProps, "onChange" | "onSend" | "requestPhoto" | "onLink" | "onAction"> {
  return {
    onChange: (changed, values) => callbacks.current.onChange?.(changed, values),
    onSend: (text, address, audience, attachments) =>
      attachments?.length
        ? callbacks.current.onSend?.(text, address, audience, attachments)
        : callbacks.current.onSend?.(text, address),
    ...(callbacks.current.requestPhoto
      ? {
          requestPhoto: (address: string) =>
            callbacks.current.requestPhoto?.(address) ?? Promise.resolve(undefined),
        }
      : {}),
    onLink: (goto, address) => callbacks.current.onLink?.(goto, address),
    onAction: (step) => callbacks.current.onAction?.(step),
  };
}
