import { useWords, useKit } from "../../provider";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePartContext } from "../../part";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { formatAddress, space } from "../../../catalog";
import type { MediaSession, ScreenController } from "../../interact";
import { KitAction } from "../input";
import { KitText } from "../text";

/** Elapsed time on the left and what is left on the right, under a scrubber. */
export function KitTimes({ elapsed, remaining }: { elapsed: string; remaining: string }) {
  return (
    <XStack justifyContent="space-between">
      <KitText role="caption" tone="muted" tabular part="elapsed">
        {elapsed}
      </KitText>
      <KitText role="caption" tone="muted" tabular part="remaining">
        {remaining}
      </KitText>
    </XStack>
  );
}

/** Hosts can provide a device adapter; the browser adapter mounts its local video or audio here. */
export function KitPlayback({
  children,
  style,
  part,
}: {
  children: ReactNode;
  style: "audio" | "video" | "compact";
  part?: string;
}) {
  const { controller } = useKit();
  const { component, item, screen } = usePartContext();
  const address =
    part === undefined ? undefined : formatAddress({ screen, component, ...(item ? { item } : {}), part });
  const mount = useRef<TamaguiElement>(null);
  const legacy = useLegacyMedia(controller, component, part === undefined);
  const addressed = useSyncExternalStore(
    address && controller ? controller.store.subscribe : noSubscription,
    () => (address ? controller?.activeMedia(address) : undefined),
    () => undefined,
  );
  const session = address === undefined ? legacy : addressed;
  const video = style === "video" && Boolean(session?.element || session?.content);
  useEffect(() => {
    const element = session?.element;
    if (!element) return;
    element.style.width = "100%";
    if (style === "video") element.style.aspectRatio = "16 / 9";
    (mount.current as HTMLElement | null)?.appendChild(element);
    return () => element.remove();
  }, [session, style]);
  return (
    <>
      {controller && (
        <YStack
          ref={mount}
          {...(video ? { aspectRatio: 16 / 9 } : { height: 0, overflow: "hidden" as const })}
        >
          {session?.content}
        </YStack>
      )}
      {!video && children}
    </>
  );
}

const noSubscription = () => () => {};
function useLegacyMedia(controller: ScreenController | undefined, component: string, enabled: boolean) {
  const { mediaUnavailable } = useWords().words;
  const [session, setSession] = useState<MediaSession>();
  useEffect(() => {
    if (!controller || !enabled) return;
    try {
      setSession(controller.mountMedia(component));
    } catch (error) {
      controller.store.set(
        `${controller.snapshotScreen().id}/${component}/error`,
        error instanceof Error ? error.message : mediaUnavailable,
      );
    }
  }, [controller, component, enabled, mediaUnavailable]);
  return session;
}

export function KitMediaControls({
  labels,
}: {
  labels: { back: string; play: string; pause: string; forward: string };
}) {
  const { mediaUnavailable } = useWords().words;
  const { controller } = useKit();
  const { screen, component } = usePartContext();
  const playing = Boolean(controller?.store.get(`${screen}/${component}/play`));
  const error = controller?.store.get(`${screen}/${component}/error`);
  return (
    <YStack gap={space.sm}>
      {Boolean(error) && (
        <KitText role="caption" tone="bad" part={null}>
          {mediaUnavailable}
        </KitText>
      )}
      <XStack justifyContent="center" alignItems="center" gap={space.md}>
        <KitAction icon="chevron_left" a11y={labels.back} kind="quiet" part="back" />
        <KitAction
          icon={playing ? "pause" : "play"}
          a11y={playing ? labels.pause : labels.play}
          kind="primary"
          part="play"
        />
        <KitAction icon="chevron_right" a11y={labels.forward} kind="quiet" part="forward" />
      </XStack>
    </YStack>
  );
}
