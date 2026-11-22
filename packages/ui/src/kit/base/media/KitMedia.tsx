import { useWords, useKit } from "../../provider";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePartContext } from "../../part";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { component as layout, formatAddress, radius, space, variants } from "../../../catalog";
import { useControlValue, type MediaSession, type ScreenController } from "../../interact";
import { KitAction } from "../input";
import { KitText } from "../text";

/** Elapsed time on the left and what is left on the right, under a scrubber. */
export function KitTimes({
  elapsed,
  remaining,
  prominent = false,
}: {
  elapsed: string;
  remaining: string;
  prominent?: boolean;
}) {
  const role = prominent ? "number" : "caption";
  return (
    <XStack justifyContent="space-between">
      <KitText role={role} numberScale="compact" tone={prominent ? "text" : "muted"} tabular part="elapsed">
        {elapsed}
      </KitText>
      <KitText role={role} numberScale="compact" tone="muted" tabular part="remaining">
        {remaining}
      </KitText>
    </XStack>
  );
}

type PlaybackProps = {
  children: ReactNode;
  style: "audio" | "video" | "compact";
  overlay?: ReactNode;
  speed?: number | undefined;
  loop?: boolean | undefined;
  loading?: boolean;
  part?: string;
};

function usePlayback({ style, speed, loop, loading, part }: Omit<PlaybackProps, "children" | "overlay">) {
  const { controller } = useKit();
  const { component, item, screen } = usePartContext();
  const address =
    part === undefined ? undefined : formatAddress({ screen, component, ...(item ? { item } : {}), part });
  const legacy = useLegacyMedia(controller, component, part === undefined && !loading);
  const addressed = useSyncExternalStore(
    address && controller ? controller.store.subscribe : noSubscription,
    () => (address ? controller?.activeMedia(address) : undefined),
    () => undefined,
  );
  const session = loading ? undefined : address === undefined ? legacy : addressed;
  const video = style === "video" && Boolean(session?.element || session?.content);
  useEffect(() => {
    const element = session?.element;
    if (!element) return;
    const previousRate = element.playbackRate;
    const previousLoop = element.loop;
    if (speed !== undefined) element.playbackRate = speed;
    if (loop !== undefined) element.loop = loop;
    return () => {
      if (speed !== undefined) element.playbackRate = previousRate;
      if (loop !== undefined) element.loop = previousLoop;
    };
  }, [session, speed, loop]);
  return { controller, video, session };
}

function PlaybackMount({ session, video }: { session: MediaSession | undefined; video: boolean }) {
  const mount = useRef<TamaguiElement>(null);
  useLayoutEffect(() => {
    const node = mount.current as HTMLElement | null;
    const element = session?.element;
    if (!node || !element) return;
    element.style.width = "100%";
    if (video) element.style.aspectRatio = String(variants.aspect.wide);
    node.appendChild(element);
    return () => {
      if (element.parentNode === node) element.remove();
    };
  }, [session, video]);
  return (
    <YStack
      ref={mount}
      {...(video ? { aspectRatio: variants.aspect.wide } : { height: 0, overflow: "hidden" as const })}
    >
      {session?.content}
    </YStack>
  );
}

/** An optional toolbar stays in the frame even when real playback replaces its fallback children. */
export function KitPlayback({ children, overlay, ...options }: PlaybackProps) {
  const { controller, video, session } = usePlayback(options);
  const playback = (
    <>
      {controller && <PlaybackMount session={session} video={video} />}
      {(!video || options.loading) && children}
    </>
  );
  if (overlay === undefined) return playback;
  return (
    <YStack
      key="playback-frame"
      position="relative"
      aspectRatio={variants.aspect.wide}
      borderRadius={radius.md}
      backgroundColor="$raised"
      overflow="hidden"
      paddingHorizontal={layout.base.none}
    >
      {playback}
      <YStack
        position="absolute"
        bottom={space.sm}
        alignSelf="center"
        borderRadius={radius.pill}
        paddingHorizontal={space.sm}
        paddingVertical={space.xs}
        backgroundColor="$surface"
      >
        {overlay}
      </YStack>
    </YStack>
  );
}

function KitPlayAction({ labels }: { labels: { play: string; pause: string } }) {
  const { screen, component } = usePartContext();
  const playing = useControlValue(`${screen}/${component}/play`, false);
  return (
    <KitAction
      icon={playing ? "pause" : "play"}
      a11y={playing ? labels.pause : labels.play}
      kind="primary"
      part="play"
    />
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
  compact = false,
}: {
  labels: { back: string; play: string; pause: string; forward: string };
  compact?: boolean;
}) {
  const { mediaUnavailable } = useWords().words;
  const { controller } = useKit();
  const { screen, component } = usePartContext();
  const error = controller?.store.get(`${screen}/${component}/error`);
  return (
    <YStack gap={space.sm}>
      {Boolean(error) && (
        <KitText role="caption" tone="bad" part={null}>
          {mediaUnavailable}
        </KitText>
      )}
      <XStack justifyContent="center" alignItems="center" gap={compact ? space.xs : space.md}>
        <KitAction icon="chevron_left" a11y={labels.back} kind="quiet" part="back" />
        <KitPlayAction labels={labels} />
        <KitAction icon="chevron_right" a11y={labels.forward} kind="quiet" part="forward" />
      </XStack>
    </YStack>
  );
}
