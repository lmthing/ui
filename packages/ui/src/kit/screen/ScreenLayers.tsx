import { isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isWeb, ScrollView, YStack } from "tamagui";
import { component, durations, motionProfiles, zIndex } from "../../catalog";
import { KitOverlay } from "../base";
import { animateNumber, usePresence } from "../motion";
import { KitVisualOnly, useKit } from "../provider";

export type ScreenLayer = {
  key: string;
  label: string;
  kind: "sheet" | "modal";
  scripted?: boolean;
  content: ReactNode;
  dismiss(): void;
};

export function ScreenLayers({ layer }: { layer: ScreenLayer | undefined }) {
  const layers = usePresence(
    layer ? <Layer key={layer.key} layer={layer} /> : null,
    (node) => !layer && isScripted(node),
  );
  return <>{layers}</>;
}

function isScripted(node: ReactNode) {
  return isValidElement<{ layer: ScreenLayer }>(node) && node.props.layer.scripted === true;
}

function Layer({ layer, exiting = false }: { layer: ScreenLayer; exiting?: boolean }) {
  if (layer.scripted) return <PaintedLayer {...layer} exiting={exiting} />;
  return (
    <YStack fullscreen zIndex={zIndex.overlay} data-screen-overlay={layer.kind}>
      <KitOverlay label={layer.label} onDismiss={layer.dismiss}>
        {layer.content}
      </KitOverlay>
    </YStack>
  );
}

/** Noninteractive playback does not move focus out of the host transport. */
function PaintedLayer({ kind, label, content, exiting }: ScreenLayer & { exiting: boolean }) {
  const { motion, environment } = useKit();
  const opacity = useLayerProgress(exiting);
  const y = environment.reduceMotion ? 0 : motionProfiles[motion].sheet * (1 - opacity);
  return (
    <YStack
      fullscreen
      bottom={environment.keyboardHeight}
      zIndex={zIndex.overlay}
      justifyContent="flex-end"
      pointerEvents="none"
      {...(exiting
        ? {
            "aria-hidden": true,
            "data-screen-overlay-exiting": kind,
            ...(isWeb ? { inert: true } : { importantForAccessibility: "no-hide-descendants" as const }),
          }
        : { "data-screen-overlay": kind })}
    >
      <YStack fullscreen opacity={component.base.skeletonOpacity * opacity} backgroundColor="$text" />
      <YStack
        {...(exiting ? {} : { role: "dialog" as const, "aria-label": label })}
        maxHeight="90%"
        {...{ opacity, y }}
      >
        <ScrollView>
          <KitVisualOnly active={exiting}>{content}</KitVisualOnly>
        </ScrollView>
      </YStack>
    </YStack>
  );
}

function useLayerProgress(exiting: boolean) {
  const { motion, environment } = useKit();
  const { reduceMotion, agentMode } = environment;
  const [progress, setProgress] = useState(agentMode ? 1 : 0);
  const last = useRef(progress);
  useLayoutEffect(() => {
    const target = exiting ? 0 : 1;
    const update = (value: number) => {
      last.current = Math.min(1, Math.max(0, value));
      setProgress(last.current);
    };
    if (agentMode) return update(target);
    if (last.current === target) return;
    return animateNumber(
      last.current,
      target,
      update,
      exiting || reduceMotion ? { duration: durations.fast } : { spring: motionProfiles[motion].spring },
    );
  }, [exiting, agentMode, reduceMotion, motion]);
  return progress;
}
