import { YStack } from "tamagui";
import { radius, space } from "../../catalog";
import { SurfaceApp, SurfaceCard, SurfaceText, type SurfaceViewProps } from "./surface-card";

export function Message({ app, content, cue }: SurfaceViewProps) {
  return (
    <SurfaceCard cue={cue}>
      <SurfaceApp app={app} />
      <YStack
        padding={space.md}
        backgroundColor="$raised"
        borderRadius={radius.md}
        borderTopLeftRadius={radius.sm}
      >
        <SurfaceText {...content} />
      </YStack>
    </SurfaceCard>
  );
}
