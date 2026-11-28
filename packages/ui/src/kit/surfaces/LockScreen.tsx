import { YStack } from "tamagui";
import { radius, space } from "../../catalog";
import { KitIcon } from "../base";
import { SurfaceApp, SurfaceCard, SurfaceText, type SurfaceViewProps } from "./surface-card";

export function LockScreen({ app, content, cue }: SurfaceViewProps) {
  return (
    <YStack backgroundColor="$raised" borderRadius={radius.xl} padding={space.lg} gap={space.lg}>
      <KitIcon name="lock" scale="lg" decorative />
      <SurfaceCard cue={cue}>
        <SurfaceApp app={app} />
        <SurfaceText {...content} />
      </SurfaceCard>
    </YStack>
  );
}
