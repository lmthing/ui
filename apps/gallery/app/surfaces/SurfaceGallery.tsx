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
          borderColor={kind === value ? "$accent" : "$line"}
          textDecorationLine={kind === value ? "underline" : "none"}
          onPress={() => choose(value)}
        >
          {labels[value]}
        </Button>
      ))}
    </XStack>
  );
}

export function SurfaceGallery({ reduced }: { reduced: boolean }) {
  const [kind, setKind] = useState<OutsideSurfaceKind>("LockScreen");
  const [cue, setCue] = useState(0);
  const environment = useEnvironment(undefined, { reduceMotion: reduced ? true : undefined });
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
          <SurfaceChooser kind={kind} choose={setKind} />
          <Button
            {...control}
            alignSelf="flex-start"
            backgroundColor="$surface"
            borderColor="$line"
            color="$text"
            onPress={() => setCue((current) => current + 1)}
          >
            Replay preview
          </Button>
        </YStack>
        <OutsideSurface kind={kind} content={examples[kind]} {...{ app, cue, environment, theme }} />
      </YStack>
    </TamaguiProvider>
  );
}
