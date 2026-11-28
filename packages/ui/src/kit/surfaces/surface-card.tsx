import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../catalog";
import { KitIcon, KitText } from "../base";
import { useChangeReveal } from "../motion";
import type { OutsideSurfaceContent, SurfaceIdentity } from "./surface-content";

export type SurfaceViewProps = {
  app: SurfaceIdentity;
  content: OutsideSurfaceContent;
  cue: number | undefined;
};

export function SurfaceCard({ children, cue }: { children: ReactNode; cue: number | undefined }) {
  // Replay the framing only. The text is fully legible, even on the first frame and during a cue.
  const progress = useChangeReveal(cue === undefined ? undefined : String(cue), false);
  return (
    <YStack
      position="relative"
      overflow="hidden"
      borderRadius={radius.lg}
      borderColor="$line"
      borderWidth={component.base.borderWidth}
      backgroundColor="$surface"
      padding={space.lg}
      gap={space.md}
    >
      <YStack
        dataSet={{ outsideSurfaceEffect: "" }}
        position="absolute"
        inset={component.base.none}
        backgroundColor="$accentSoft"
        opacity={1 - progress}
        pointerEvents="none"
        aria-hidden
      />
      {children}
    </YStack>
  );
}

export function SurfaceApp({ app }: { app: SurfaceIdentity }) {
  return (
    <XStack gap={space.sm} alignItems="center">
      <YStack
        width={size.avatar.sm}
        height={size.avatar.sm}
        flexShrink={component.base.none}
        borderRadius={radius.sm}
        backgroundColor="$accentSoft"
        alignItems="center"
        justifyContent="center"
      >
        <KitIcon name={app.icon} tone="accent" scale="sm" decorative />
      </YStack>
      <YStack flexShrink={component.base.bodyFlex} minWidth={component.base.none}>
        <KitText role="label" part={null} breakLongWords>
          {app.name}
        </KitText>
      </YStack>
    </XStack>
  );
}

export function SurfaceText({
  title,
  body,
  heading = "heading",
}: OutsideSurfaceContent & { heading?: "heading" | "title" }) {
  return (
    <YStack gap={space.xs}>
      <KitText role={heading} part={null} breakLongWords>
        {title}
      </KitText>
      {body && (
        <KitText role="body" part={null} breakLongWords>
          {body}
        </KitText>
      )}
    </YStack>
  );
}
