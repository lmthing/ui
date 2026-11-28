import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { YStack, type TamaguiElement } from "tamagui";
import { usePhoneController } from "./use-phone-controller";
import {
  emptyDeviceData,
  type ActStep,
  type Definition,
  type DeviceData,
  type ScreenLike,
  type ThemeChoice,
  type Values,
  type Issue,
} from "../../catalog";
import { KitProvider, useEnvironment, type Environment, type NativeHost } from "../provider";
import {
  createAgentAccess,
  DeviceDataContext,
  type AttachmentHost,
  type AuthenticateReveal,
  type ClipboardText,
  type ClipboardWriter,
  type HostCommandAdapter,
  type ParentGate,
  type InteractionStore,
  type MediaAdapter,
  type PlaybackResolver,
  type PrivateValuesHost,
  type SendHandler,
  type ScreenController,
} from "../interact";
import type { PartRegistry } from "../registry";
import type { MicCaptureAdapter } from "../interact/runtime";
import { Screen, type RendererMap } from "./Screen";
import { useNavigationMotion } from "./use-navigation-motion";
import { NativeTabGhost, type NativeTabShot } from "./NativeTabGhost";
import type { PhoneAgent } from "./agent-access";
import { usePhoneAgent } from "./use-phone-agent";
import { PartRefScope } from "../part";
import { arrivalAddress, type ReturnPoint } from "./return-point";

function usePhoneLifecycle(controller: ScreenController) {
  const lifecycle = useMemo(() => ({ mounted: false, started: false }), [controller]);
  const [, render] = useState(0);
  useLayoutEffect(() => controller.store.subscribe(() => render((version) => version + 1)), [controller]);
  useLayoutEffect(() => {
    if (lifecycle.started) return;
    lifecycle.started = true;
    controller.mount();
  }, [controller, lifecycle]);
  useEffect(() => {
    lifecycle.mounted = true;
    return () => {
      lifecycle.mounted = false;
      queueMicrotask(() => {
        if (!lifecycle.mounted) controller.dispose();
      });
    };
  }, [controller, lifecycle]);
}

/** The host supplies local media resolution and callbacks; every input uses the same dispatcher. */
export type PhoneScreenProps = {
  defs: Record<string, Definition>;
  renderers: RendererMap;
  /** On a peer root, supply one TabBar with its active `at` and a plain Header.
   * On a pushed screen, omit TabBar and use Header `style: "back"`.
   * A task Button pins above tabs; a quiet Button stays in the scrolling body. */
  screen: ScreenLike;
  theme: ThemeChoice;
  lang?: string | undefined;
  parts?: PartRegistry | undefined;
  /** The host resolves destinations and history. The Header back control sends `"back"`. */
  onLink?: ((goto: string, address: string) => void) | undefined;
  /** Whether a committed link replaces the current route instead of adding to host history. */
  replacesRoute?: ((from: string, to: string) => boolean) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
  authenticateReveal?: AuthenticateReveal | undefined;
  privateValues?: PrivateValuesHost | undefined;
  resolveClipboardText?: ClipboardText | undefined;
  writeClipboard?: ClipboardWriter | undefined;
  resolvePhoto?: ((reference: string) => string | undefined) | undefined;
  resolveMedia?: ((reference: string) => string | undefined) | undefined;
  media?: MediaAdapter | undefined;
  micCapture?: MicCaptureAdapter | undefined;
  resolvePlayback?: PlaybackResolver | undefined;
  attachments?: AttachmentHost | undefined;
  /** Opt in with a stable callback; return a cleanup to retract any host publication. */
  onReady?: ((agent: PhoneAgent) => (() => void) | void) | undefined;
  /** Allow reads but not acts or resets, even when human interaction is enabled. */
  agentReadOnly?: boolean | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: SendHandler | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  interaction?: InteractionStore | undefined;
  deviceData?: DeviceData | undefined;
  hostCommands?: HostCommandAdapter | undefined;
  parentGate?: ParentGate | undefined;
  interactive?: boolean | undefined;
  onReport?: ((issues: Issue[]) => void) | undefined;
  nativeHost?: NativeHost | undefined;
  reduceMotion?: boolean | undefined;
  agentMode?: boolean | undefined;
  signature?: string | undefined;
  cue?: number | undefined;
};
function freezeNativeTab(
  { defs, renderers, theme, lang, resolvePhoto, deviceData, screen }: PhoneScreenProps,
  controller: ScreenController,
  scrollTop: number,
): NativeTabShot {
  return {
    defs,
    renderers,
    theme,
    lang,
    resolvePhoto,
    deviceData,
    screen: controller.snapshotScreen(),
    values: controller.store.snapshot(screen.id),
    scrollTop,
  };
}

type LinkObserver = ReturnType<typeof useNavigationMotion>["capture"];

function usePhoneNavigation(
  props: PhoneScreenProps,
  controller: ScreenController,
  environment: Environment,
  observe: RefObject<LinkObserver | undefined>,
) {
  const { screen } = props;
  const bodyScroll = useRef({ id: screen.id, top: 0 });
  const refs = useMemo(() => new Map<string, RefObject<TamaguiElement | null>>(), []);
  const parent = useContext(PartRefScope);
  const register = useMemo(
    () => (address: string, ref: RefObject<TamaguiElement | null>) => {
      refs.set(address, ref);
      const unregister = parent?.(address, ref);
      return () => {
        if (refs.get(address) === ref) refs.delete(address);
        unregister?.();
      };
    },
    [refs, parent],
  );
  const navigation = useNavigationMotion(
    screen,
    props.theme.motion ?? "calm",
    environment.reduceMotion,
    environment.agentMode,
    () =>
      freezeNativeTab(props, controller, bodyScroll.current.id === screen.id ? bodyScroll.current.top : 0),
    () => (bodyScroll.current.id === screen.id ? bodyScroll.current.top : 0),
    (point: ReturnPoint | undefined) => {
      const open = point && (refs.get(point.address) ?? refs.get(`${point.address}/root`));
      const heading = arrivalAddress(screen);
      const target = open?.current ?? (heading ? refs.get(heading)?.current : undefined);
      if (target) props.nativeHost?.focusAccessibility?.(target);
    },
    props.replacesRoute,
  );
  useLayoutEffect(() => {
    observe.current = navigation.capture;
  }, [observe, navigation.capture]);
  return {
    ...navigation,
    register,
    onBodyScroll: (top: number) => {
      bodyScroll.current = { id: screen.id, top };
    },
  };
}

export function PhoneScreen(props: PhoneScreenProps) {
  const { defs, screen, nativeHost, reduceMotion, agentMode, signature, cue, onReady } = props;
  const observe = useRef<LinkObserver>(undefined);
  const controller = usePhoneController(props, (...args) => observe.current?.(...args));
  const storeAgent = controller.store.get(`${screen.id}/$agentMode`);
  const environment = useEnvironment(nativeHost, {
    reduceMotion,
    agentMode: agentMode ?? Boolean(storeAgent),
    signature,
    cue,
  });
  const navigation = usePhoneNavigation(props, controller, environment, observe);
  const agent = useMemo(
    () => createAgentAccess({ defs, store: controller.store, current: () => screen, runtime: controller }),
    [controller, screen, defs],
  );
  usePhoneLifecycle(controller);
  usePhoneAgent(agent, onReady, props.interactive ?? true, props.agentReadOnly ?? false);
  return (
    <KitProvider
      theme={props.theme}
      lang={props.lang}
      {...(props.parts ? { parts: props.parts } : {})}
      {...(props.resolvePhoto ? { resolvePhoto: props.resolvePhoto } : {})}
      controller={controller}
      interactive={props.interactive ?? true}
      environment={
        agentMode === undefined && storeAgent === undefined && navigation.agentArrival
          ? { ...environment, agentMode: true }
          : environment
      }
      {...(nativeHost ? { nativeHost } : {})}
    >
      <DeviceDataContext.Provider value={props.deviceData ?? emptyDeviceData}>
        <YStack flex={1} minHeight={0} position="relative">
          {navigation.nativeGhost && <NativeTabGhost shot={navigation.nativeGhost} />}
          <YStack ref={navigation.ref} flex={1} minHeight={0} backgroundColor="$bg" {...navigation.pose}>
            <PartRefScope.Provider value={navigation.register}>
              <Screen
                controller={controller}
                renderers={props.renderers}
                initialBodyScroll={navigation.initialBodyScroll}
                onBodyScroll={navigation.onBodyScroll}
                {...(props.onReport ? { onReport: props.onReport } : {})}
              />
            </PartRefScope.Provider>
          </YStack>
        </YStack>
      </DeviceDataContext.Provider>
    </KitProvider>
  );
}
