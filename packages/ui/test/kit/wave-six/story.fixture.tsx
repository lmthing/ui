import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, YStack } from "tamagui";
import { sequenceKey, space, themeName, type SequenceState } from "@lmthing/ui/catalog";
import { createScreenController, KitAction, KitProvider, KitStepsTrack, PartScope } from "@lmthing/ui/kit";
import { config } from "../../render";
import { defs, interval, screen, theme } from "./story-data";

let now = interval / 2;
let redraw: (() => void) | undefined;
const controller = createScreenController({
  defs,
  screen,
  now: () => now,
  requireMounted: true,
  onChange: () => redraw?.(),
});
declare global {
  interface Window {
    storyTick(ms: number): void;
  }
}
window.storyTick = (ms) => {
  now += ms;
  controller.tick();
  redraw?.();
};
const holdToPause = {
  part: "story",
  playingLabel: "Playing",
  pausedLabel: "Paused",
  pauseLabel: "Pause",
  resumeLabel: "Resume",
};

function Fixture() {
  const [, setDraw] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    redraw = () => setDraw((draw) => draw + 1);
    controller.mount();
    window.storyTick(interval / 2);
    return controller.dispose;
  }, []);
  const saved = controller.store.get(`home/story/${sequenceKey}`) as SequenceState | undefined;
  const current = saved?.index ?? 0;
  const progress = (saved?.since === undefined ? (saved?.elapsedMs ?? 0) : now - saved.since) / interval;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} controller={controller} interactive>
        <PartScope screen="home" component="story" rev={1} state="filled">
          <YStack padding={space.md} gap={space.md}>
            <KitStepsTrack style="segmented" count={3} at={current + 1} progress={progress} />
            <output>{current + 1}</output>
            {show && <KitAction label="Next" part="next" action="press" holdToPause={holdToPause} />}
            <KitAction label="Stop" part="story" action="stop" />
            <button onClick={() => setShow(false)}>Hide next</button>
            <button onClick={() => controller.registerDisabledPart("home/story/story")}>
              Block playback
            </button>
          </YStack>
        </PartScope>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
