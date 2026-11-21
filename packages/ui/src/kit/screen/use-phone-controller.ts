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
  const { screen, defs, interaction, interactive = true, media } = props;
  const { requestPhoto, hostCommands, parentGate } = props;
  const language = useRef(props.lang);
  language.current = props.lang;
  const callbacks = useRef(props);
  callbacks.current = props;
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  const hasMediaResolver = Boolean(props.resolveMedia);
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
      hostCommands,
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
  }, [
    screen,
    defs,
    media,
    hasMediaResolver,
    store,
    interactive,
    Boolean(requestPhoto),
    hostCommands,
    parentGate,
  ]);
  useCommittedDeviceData(source, props.deviceData);
  return source.controller;
}
