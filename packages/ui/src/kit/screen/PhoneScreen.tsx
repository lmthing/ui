import { useMemo } from "react";
import { usePhoneController } from "./use-phone-controller";
import { usePhoneLifecycle } from "./use-phone-lifecycle";
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
import { KitProvider, useEnvironment, type NativeHost } from "../provider";
import {
  createAgentAccess,
  DeviceDataContext,
  type AttachmentHost,
  type AuthenticateReveal,
  type HostCommandAdapter,
  type ParentGate,
  type InteractionStore,
  type MediaAdapter,
  type PlaybackResolver,
  type SendHandler,
} from "../interact";
import type { PartRegistry } from "../registry";
import { Screen, type RendererMap } from "./Screen";

type AgentAccess = ReturnType<typeof createAgentAccess>;
declare global {
  interface Window {
    __lmthingUI?: AgentAccess;
  }
}

/** The host supplies local media resolution and callbacks; every input uses the same dispatcher. */
export type PhoneScreenProps = {
  defs: Record<string, Definition>;
  renderers: RendererMap;
  screen: ScreenLike;
  theme: ThemeChoice;
  lang?: string | undefined;
  parts?: PartRegistry | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
  authenticateReveal?: AuthenticateReveal | undefined;
  resolvePhoto?: ((reference: string) => string | undefined) | undefined;
  resolveMedia?: ((reference: string) => string | undefined) | undefined;
  media?: MediaAdapter | undefined;
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
export function PhoneScreen(props: PhoneScreenProps) {
  const { defs, screen, nativeHost, reduceMotion, agentMode, signature, cue, onReady } = props;
  const controller = usePhoneController(props);
  const agent = useMemo(
    () => createAgentAccess({ defs, store: controller.store, current: () => screen, runtime: controller }),
    [controller, screen, defs],
  );
  const environment = useEnvironment(nativeHost, {
    reduceMotion,
    agentMode: agentMode ?? Boolean(controller.store.get(`${screen.id}/$agentMode`)),
    signature,
    cue,
  });
  usePhoneLifecycle(controller, agent, onReady);
  return (
    <KitProvider
      theme={props.theme}
      lang={props.lang}
      {...(props.parts ? { parts: props.parts } : {})}
      {...(props.resolvePhoto ? { resolvePhoto: props.resolvePhoto } : {})}
      controller={controller}
      interactive={props.interactive ?? true}
      environment={environment}
      {...(nativeHost ? { nativeHost } : {})}
    >
      <DeviceDataContext.Provider value={props.deviceData ?? emptyDeviceData}>
        <Screen
          controller={controller}
          renderers={props.renderers}
          {...(props.onReport ? { onReport: props.onReport } : {})}
        />
      </DeviceDataContext.Provider>
    </KitProvider>
  );
}
