import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { isWeb, YStack } from "tamagui";
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
import { useReturnFocus } from "./use-return-focus";
import { PartRefScope } from "../part";
import type { ScreenNavigation, ScreenTransition } from "./screen-navigation";
import type { BodyScrollHandle } from "./screen-parts";

type AgentAccess = ReturnType<typeof createAgentAccess>;
declare global {
  interface Window {
    __lmthingUI?: AgentAccess;
  }
}

function usePhoneLifecycle(
  controller: ScreenController,
  agent: AgentAccess,
  onReady: ((agent: AgentAccess) => void) | undefined,
) {
  const lifecycle = useMemo(() => ({ mounted: false }), [controller]);
  const [, render] = useState(0);
  useEffect(() => controller.store.subscribe(() => render((version) => version + 1)), [controller]);
  useEffect(() => {
    lifecycle.mounted = true;
    controller.mount();
    return () => {
      if (typeof window !== "undefined" && window.__lmthingUI === agent) delete window.__lmthingUI;
      lifecycle.mounted = false;
      queueMicrotask(() => {
        if (!lifecycle.mounted) controller.dispose();
      });
    };
  }, [agent, controller, lifecycle]);
  useEffect(() => {
    // A layout effect can synchronously mount pinned descendants in a second commit.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (typeof window !== "undefined") window.__lmthingUI = agent;
      onReady?.(agent);
    });
    return () => {
      active = false;
    };
  }, [agent, onReady]);
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
  /** Capture a scripted transition before the host switches trees, independent of action dispatch. */
  navigationRef?: Ref<ScreenNavigation> | undefined;
  /** A new capture animates only this destination; reuse, preference changes and remounts do not replay it. */
  navigationTransition?: ScreenTransition | undefined;
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
  onReady?: ((agent: AgentAccess) => void) | undefined;
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
  const scrollRef = useRef<BodyScrollHandle>(null);
  const scrollTop = (): number => {
    const node = isWeb ? scrollRef.current?.getScrollableNode?.() : undefined;
    return node?.scrollTop ?? (bodyScroll.current.id === screen.id ? bodyScroll.current.top : 0);
  };
  const navigation = useNavigationMotion(screen, {
    mode: props.theme.motion ?? "calm",
    reduced: environment.reduceMotion,
    agent: environment.agentMode,
    scrollTop,
    captureNative: () => freezeNativeTab(props, controller, scrollTop()),
    transition: props.navigationTransition,
  });
  useImperativeHandle(
    props.navigationRef,
    () => ({
      prepare: navigation.prepare,
      getReturnPoint: (address) => ({ scrollTop: scrollTop(), ...(address ? { address } : {}) }),
    }),
    [navigation.prepare],
  );
  useLayoutEffect(() => {
    observe.current = navigation.capture;
  }, [observe, navigation.capture]);
  useLayoutEffect(() => {
    if (bodyScroll.current.id !== screen.id)
      bodyScroll.current = { id: screen.id, top: navigation.returnTo?.scrollTop ?? 0 };
  }, [screen.id, navigation.returnTo]);
  return {
    ...navigation,
    scrollRef,
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
  usePhoneLifecycle(controller, agent, onReady);
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
      <PhoneScreenFrame {...{ props, navigation, controller }} />
    </KitProvider>
  );
}

function PhoneScreenFrame({
  props,
  navigation,
  controller,
}: {
  props: PhoneScreenProps;
  navigation: ReturnType<typeof usePhoneNavigation>;
  controller: ScreenController;
}) {
  const register = useReturnFocus(
    navigation.ref,
    navigation.restoreFocus ? navigation.returnTo : undefined,
    props.nativeHost,
  );
  return (
    <DeviceDataContext.Provider value={props.deviceData ?? emptyDeviceData}>
      <YStack flex={1} minHeight={0} position="relative">
        {navigation.nativeGhost && <NativeTabGhost shot={navigation.nativeGhost} />}
        <YStack ref={navigation.ref} flex={1} minHeight={0} backgroundColor="$bg" {...navigation.pose}>
          <PartRefScope.Provider value={register}>
            <Screen
              controller={controller}
              renderers={props.renderers}
              scrollRef={navigation.scrollRef}
              onBodyScroll={navigation.onBodyScroll}
              {...(navigation.returnTo ? { restoration: navigation.returnTo } : {})}
              {...(props.onReport ? { onReport: props.onReport } : {})}
            />
          </PartRefScope.Provider>
        </YStack>
      </YStack>
    </DeviceDataContext.Provider>
  );
}
