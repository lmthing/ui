import { useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createScreenController,
  createInteractionStore,
  browserMediaAdapter,
  type ScreenController,
} from "../interact";
import type { PhoneScreenProps } from "./PhoneScreen";

type HostSnapshot = Pick<
  PhoneScreenProps,
  | "deviceData"
  | "hostCommands"
  | "authenticateReveal"
  | "attachments"
  | "resolvePlayback"
  | "privateValues"
  | "resolveClipboardText"
>;
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

function createCommittedController(
  options: Parameters<typeof createScreenController>[0],
  committed: { snapshot: HostSnapshot },
  callbacks: { current: PhoneScreenProps },
) {
  return createScreenController({
    ...options,
    ...phoneCallbacks(callbacks),
    get lang() {
      return callbacks.current.lang;
    },
    get deviceData() {
      return committed.snapshot.deviceData;
    },
    get hostCommands() {
      return committed.snapshot.hostCommands;
    },
    get authenticateReveal() {
      return committed.snapshot.authenticateReveal;
    },
    get privateValues() {
      return committed.snapshot.privateValues;
    },
    get attachments() {
      return committed.snapshot.attachments;
    },
    get resolvePlayback() {
      return committed.snapshot.resolvePlayback;
    },
    resolveClipboardText: (address: string) => committed.snapshot.resolveClipboardText?.(address),
  });
}

type ObserveLink = (goto: string, address: string, agent: boolean) => void;

export function usePhoneController(props: PhoneScreenProps, observeLink?: ObserveLink) {
  const { screen, defs, interaction, interactive = true, media, micCapture } = props;
  const { requestPhoto, parentGate, writeClipboard } = props;
  const { attachments, resolvePlayback } = props;
  const callbacks = useRef(props);
  const localStore = useMemo(() => createInteractionStore(), [screen.id]);
  const store = interaction ?? localStore;
  callbacks.current = {
    ...props,
    onLink:
      props.onLink &&
      ((goto, address) => {
        observeLink?.(goto, address, props.agentMode ?? Boolean(store.get(`${screen.id}/$agentMode`)));
        props.onLink?.(goto, address);
      }),
  };
  const hasMediaResolver = Boolean(props.resolveMedia);
  const snapshot = useHostSnapshot(props);
  const source = useMemo(() => {
    const committed = { snapshot };
    const options = {
      screen,
      defs,
      writeClipboard,
      store,
      parentGate,
      interactive,
      micCapture,
      requireMounted: true,
      media:
        media ??
        (hasMediaResolver
          ? browserMediaAdapter((reference) => callbacks.current.resolveMedia?.(reference))
          : undefined),
    };
    const controller = createCommittedController(options, committed, callbacks);
    return { controller, committed };
  }, [
    screen,
    defs,
    media,
    micCapture,
    Boolean(attachments),
    Boolean(resolvePlayback),
    hasMediaResolver,
    store,
    interactive,
    Boolean(requestPhoto),
    writeClipboard,
    parentGate,
  ]);
  useCommittedHost(source, snapshot);
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

function useHostSnapshot({
  deviceData,
  hostCommands,
  authenticateReveal,
  attachments,
  resolvePlayback,
  privateValues,
  resolveClipboardText,
}: PhoneScreenProps) {
  return useMemo(
    () => ({
      deviceData,
      hostCommands,
      authenticateReveal,
      attachments,
      resolvePlayback,
      privateValues,
      resolveClipboardText,
    }),
    [
      deviceData,
      hostCommands,
      authenticateReveal,
      attachments,
      resolvePlayback,
      privateValues,
      resolveClipboardText,
    ],
  );
}
