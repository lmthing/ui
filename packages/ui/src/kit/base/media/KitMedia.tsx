import { useEffect, useRef, useState, type ReactNode } from "react";
import { useKit } from "../../provider";
import { usePartContext } from "../../part";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { mediaUnavailable, space } from "../../../catalog";
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
}: {
  children: ReactNode;
  style: "audio" | "video" | "compact";
}) {
  const { controller } = useKit();
  const { component } = usePartContext();
  const mount = useRef<TamaguiElement>(null);
  const [content, setContent] = useState<ReactNode>(null);
  const [video, setVideo] = useState(false);
  useEffect(() => {
    if (!controller) return;
    try {
      const session = controller.mountMedia(component);
      setContent(session?.content ?? null);
      const element = session?.element;
      setVideo(style === "video" && Boolean(element || session?.content));
      if (!element) return;
      element.style.width = "100%";
      if (style === "video") element.style.aspectRatio = "16 / 9";
      (mount.current as HTMLElement | null)?.appendChild(element);
      return () => {
        element.remove();
      };
    } catch (error) {
      controller.store.set(
        `${controller.snapshotScreen().id}/${component}/error`,
        error instanceof Error ? error.message : "Recording unavailable",
      );
    }
  }, [controller, component, style]);
  return (
    <>
      {controller && (
        <YStack
          ref={mount}
          {...(video ? { aspectRatio: 16 / 9 } : { height: 0, overflow: "hidden" as const })}
        >
          {content}
        </YStack>
      )}
      {!video && children}
    </>
  );
}

export function KitMediaControls({
  labels,
}: {
  labels: { back: string; play: string; pause: string; forward: string };
}) {
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
