import { useWords, useKit } from "../../provider";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePartContext } from "../../part";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { radius, space, variants } from "../../../catalog";
import { useControlValue } from "../../interact";
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

type PlaybackProps = {
  children: ReactNode;
  style: "audio" | "video" | "compact";
  overlay?: ReactNode;
  speed?: number | undefined;
  loop?: boolean | undefined;
};

function usePlayback({ style, speed, loop, overlay }: Omit<PlaybackProps, "children">) {
  const { controller } = useKit();
  const { component } = usePartContext();
  const mount = useRef<TamaguiElement>(null);
  const [content, setContent] = useState<ReactNode>(null);
  const {
    words: { mediaUnavailable },
  } = useWords();
  const [video, setVideo] = useState(false);
  const elementRef = useRef<HTMLMediaElement | null>(null);
  const framed = overlay !== undefined;
  useEffect(() => {
    if (!controller) {
      setVideo(false);
      return;
    }
    try {
      const session = controller.mountMedia(component);
      setContent(session?.content ?? null);
      const element = session?.element;
      setVideo(style === "video" && Boolean(element || session?.content));
      if (!element) return;
      element.style.width = "100%";
      if (style === "video") element.style.aspectRatio = String(variants.aspect.wide);
      const media = typeof HTMLMediaElement !== "undefined" && element instanceof HTMLMediaElement;
      if (media) elementRef.current = element;
      (mount.current as HTMLElement | null)?.appendChild(element);
      return () => {
        elementRef.current = null;
        element.remove();
      };
    } catch (error) {
      controller.store.set(
        `${controller.snapshotScreen().id}/${component}/error`,
        error instanceof Error ? error.message : mediaUnavailable,
      );
    }
  }, [controller, component, style, mediaUnavailable, framed]);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const previousRate = element.playbackRate;
    const previousLoop = element.loop;
    if (speed !== undefined) element.playbackRate = speed;
    if (loop !== undefined) element.loop = loop;
    return () => {
      if (speed !== undefined) element.playbackRate = previousRate;
      if (loop !== undefined) element.loop = previousLoop;
    };
  }, [controller, component, style, mediaUnavailable, framed, speed, loop]);
  return { controller, mount, video, content };
}

/** An optional toolbar stays in the frame even when real playback replaces its fallback children. */
export function KitPlayback({ children, overlay, ...options }: PlaybackProps) {
  const { controller, mount, video, content } = usePlayback({ ...options, overlay });
  const playback = (
    <>
      {controller && (
        <YStack
          ref={mount}
          {...(video ? { aspectRatio: variants.aspect.wide } : { height: 0, overflow: "hidden" as const })}
        >
          {content}
        </YStack>
      )}
      {!video && children}
    </>
  );
  if (overlay === undefined) return playback;
  return (
    <YStack
      position="relative"
      aspectRatio={variants.aspect.wide}
      borderRadius={radius.md}
      backgroundColor="$raised"
      overflow="hidden"
    >
      {playback}
      <YStack
        position="absolute"
        bottom={space.sm}
        alignSelf="center"
        borderRadius={radius.pill}
        paddingHorizontal={space.sm}
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
