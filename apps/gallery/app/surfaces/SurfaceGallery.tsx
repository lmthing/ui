import { useState } from "react";
import { Button, TamaguiProvider, Text, XStack, YStack } from "tamagui";
import { size, space, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import {
  OutsideSurface,
  outsideSurfaceKinds,
  useEnvironment,
  type OutsideSurfaceKind,
} from "@lmthing/ui/kit";
import { config } from "../../index";
import { app, examples, labels } from "./surface-examples";

const phoneWidth = 390;
const theme = { preset: "calm", accent: "moss", mode: "light", motion: "calm" } satisfies ThemeChoice;
const control = { minHeight: size.control.md, fontFamily: "$humanist", fontSize: "$label" } as const;

function SurfaceChooser({
  kind,
  choose,
}: {
  kind: OutsideSurfaceKind;
  choose: (kind: OutsideSurfaceKind) => void;
}) {
  return (
    <XStack role="group" aria-label="Choose a surface" gap={space.sm} flexWrap="wrap">
      {outsideSurfaceKinds.map((value) => (
        <Button
          key={value}
          {...control}
          aria-pressed={kind === value}
          color="$text"
          backgroundColor={kind === value ? "$accentSoft" : "$surface"}
          borderColor={kind === value ? "$accent" : "$muted"}
          onPress={() => choose(value)}
        >
          <Text
            fontFamily={control.fontFamily}
            fontSize={control.fontSize}
            color="$text"
            textDecorationLine={kind === value ? "underline" : "none"}
          >
            {labels[value]}
          </Text>
        </Button>
      ))}
    </XStack>
  );
}

function ReplayControl({ cue, replay }: { cue: number; replay: () => void }) {
  return (
    <XStack alignItems="center" gap={space.md} flexWrap="wrap">
      <Button {...control} backgroundColor="$surface" borderColor="$muted" color="$text" onPress={replay}>
        Replay preview
      </Button>
      <Text role="status" color="$muted" fontFamily={control.fontFamily} fontSize={control.fontSize}>
        {cue === 0 ? "" : cue === 1 ? "Preview replayed" : `Preview replayed ${cue} times`}
      </Text>
    </XStack>
  );
}

export function SurfaceGallery({ reduced }: { reduced: boolean }) {
  const [kind, setKind] = useState<OutsideSurfaceKind>("LockScreen");
  const [cue, setCue] = useState(0);
  const environment = useEnvironment(undefined, { reduceMotion: reduced ? true : undefined });
  const choose = (next: OutsideSurfaceKind) => {
    if (kind === next) return;
    setKind(next);
    setCue(0);
  };
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <YStack
        tag="main"
        width="100%"
        maxWidth={phoneWidth}
        alignSelf="center"
        backgroundColor="$bg"
        minHeight="100vh"
      >
        <YStack padding={space.lg} gap={space.lg}>
          <Text tag="h1" margin={0} fontFamily="$humanist" fontSize="$title" fontWeight="bold" color="$text">
            Outside surfaces
          </Text>
          <SurfaceChooser kind={kind} choose={choose} />
          <ReplayControl cue={cue} replay={() => setCue((current) => current + 1)} />
        </YStack>
        <OutsideSurface kind={kind} content={examples[kind]} {...{ app, cue, environment, theme }} />
      </YStack>
    </TamaguiProvider>
  );
}
