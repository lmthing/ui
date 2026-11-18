import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ActStep,
  type Definition,
  type ScreenLike,
  type ThemeChoice,
  type Values,
  type Issue,
} from "../../catalog";
import { KitProvider } from "../provider";
import { createAgentAccess } from "../interact/agent";
import { createInteractionStore, type InteractionStore } from "../interact/store";
import { useEnvironment } from "../provider/useEnvironment";
import type { NativeHost } from "../provider/environment";
import { createScreenController } from "../interact/controller";
import { browserMediaAdapter, type MediaAdapter } from "../interact/media";
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
  parts?: PartRegistry | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
  resolvePhoto?: ((reference: string) => string | undefined) | undefined;
  resolveMedia?: ((reference: string) => string | undefined) | undefined;
  media?: MediaAdapter | undefined;
  onReady?: ((agent: AgentAccess) => void) | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: ((text: string, address: string) => void) | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  interaction?: InteractionStore | undefined;
  interactive?: boolean | undefined;
  onReport?: ((issues: Issue[]) => void) | undefined;
  nativeHost?: NativeHost | undefined;
  reduceMotion?: boolean | undefined;
  agentMode?: boolean | undefined;
  signature?: string | undefined;
  cue?: number | undefined;
};
export function PhoneScreen({
  defs,
  renderers,
  screen,
  theme,
  parts,
  onLink,
  onAction,
  resolvePhoto,
  resolveMedia,
  media,
  onReady,
  onChange,
  onSend,
  requestPhoto,
  interaction,
  interactive = true,
  onReport,
  nativeHost,
  reduceMotion,
  agentMode,
  signature,
  cue,
}: PhoneScreenProps) {
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
  const agent = useMemo(
    () => createAgentAccess({ defs, store: controller.store, current: () => screen, runtime: controller }),
    [controller, screen, defs],
  );
  const lifecycle = useMemo(() => ({ mounted: false }), [controller]);
  const [, render] = useState(0);
  const environment = useEnvironment(nativeHost, {
    reduceMotion,
    agentMode: agentMode ?? Boolean(controller.store.get(`${screen.id}/$agentMode`)),
    signature,
    cue,
  });
  useEffect(() => controller.store.subscribe(() => render((version) => version + 1)), [controller]);
  useEffect(() => {
    lifecycle.mounted = true;
    controller.mount();
    if (typeof window !== "undefined") window.__lmthingUI = agent;
    return () => {
      if (typeof window !== "undefined" && window.__lmthingUI === agent) delete window.__lmthingUI;
      lifecycle.mounted = false;
      queueMicrotask(() => {
        if (!lifecycle.mounted) controller.dispose();
      });
    };
  }, [agent, controller, lifecycle]);
  useEffect(() => {
    onReady?.(agent);
  }, [agent, onReady]);
  return (
    <KitProvider
      theme={theme}
      {...(parts ? { parts } : {})}
      {...(resolvePhoto ? { resolvePhoto } : {})}
      controller={controller}
      interactive={interactive}
      environment={environment}
      {...(nativeHost ? { nativeHost } : {})}
    >
      <Screen controller={controller} renderers={renderers} {...(onReport ? { onReport } : {})} />
    </KitProvider>
  );
}
