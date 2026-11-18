import { useEffect, useMemo, useRef, useState } from "react";
import { type ActStep, type Definition, type ScreenLike, type ThemeChoice } from "../../catalog";
import { KitProvider } from "../provider";
import { createAgentAccess } from "../interact/agent";
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
}: PhoneScreenProps) {
  const callbacks = useRef({ onLink, onAction, resolveMedia });
  callbacks.current = { onLink, onAction, resolveMedia };
  const hasMediaResolver = Boolean(resolveMedia);
  const controller = useMemo(
    () =>
      createScreenController({
        screen,
        defs,
        onLink: (goto, address) => callbacks.current.onLink?.(goto, address),
        onAction: (step) => callbacks.current.onAction?.(step),
        media:
          media ??
          (hasMediaResolver
            ? browserMediaAdapter((reference) => callbacks.current.resolveMedia?.(reference))
            : undefined),
      }),
    [screen, defs, media, hasMediaResolver],
  );
  const agent = useMemo(
    () => createAgentAccess({ defs, store: controller.store, current: () => screen, runtime: controller }),
    [controller, screen, defs],
  );
  const lifecycle = useMemo(() => ({ mounted: false }), [controller]);
  const [, render] = useState(0);
  useEffect(() => controller.store.subscribe(() => render((version) => version + 1)), [controller]);
  useEffect(() => {
    lifecycle.mounted = true;
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
      interactive
    >
      <Screen controller={controller} renderers={renderers} />
    </KitProvider>
  );
}
