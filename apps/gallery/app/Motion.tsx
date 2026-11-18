import { useCallback, useMemo, useState } from "react";
import { TamaguiProvider, YStack } from "tamagui";
import { components, signatures, type SignatureName, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../index";
export function MotionPreview({ name }: { name: SignatureName }) {
  const [cue, setCue] = useState(0);
  const spec = signatures[name] ?? signatures.ring_fill;
  const screen = useMemo<ScreenLike>(() => {
    const c = spec.component as keyof typeof components;
    const def = components[c];
    const example = name === "day_unfold" ? components.Timeline.examples[2] : def.examples[0];
    return {
      id: "preview",
      components: [
        { id: "h1", c: "Header", title: c },
        { id: "c1", c, ...(example as object) },
        { id: "b1", c: "Button", label: "Replay", kind: "secondary" },
      ],
    };
  }, [name]);
  const onAction = useCallback((step: { address: string }) => {
    if (step.address === "preview/b1" || step.address === "preview/b1/root") setCue((value) => value + 1);
  }, []);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={430} height="100vh" alignSelf="center">
        <PhoneScreen
          screen={screen}
          theme={{ preset: "calm", mode: "light", accent: "moss" }}
          signature={name}
          cue={cue}
          onAction={onAction}
        />
      </YStack>
    </TamaguiProvider>
  );
}
