import { SurfaceApp, SurfaceCard, SurfaceText, type SurfaceViewProps } from "./surface-card";

export function Widget({ app, content, cue }: SurfaceViewProps) {
  return (
    <SurfaceCard cue={cue}>
      <SurfaceApp app={app} />
      <SurfaceText {...content} heading="title" />
    </SurfaceCard>
  );
}
