import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { themeName, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../../../apps/gallery";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const sessions: ScreenLike = {
  id: "mind",
  components: [
    { id: "b1", c: "Breathe", style: "grounding", rounds: 1 },
    {
      id: "s1",
      c: "Soundscape",
      timer: 10,
      sounds: [
        { label: "Rain", icon: "cloud_rain", level: 6 },
        { label: "Wind", icon: "wind", level: 2 },
      ],
      presets: [
        { label: "Night rain", levels: [3, 0] },
        { label: "Day rain", levels: [10, 4] },
      ],
    },
  ],
};
const records: ScreenLike = {
  id: "mind",
  components: [
    {
      id: "e1",
      c: "Entries",
      media: "none",
      prompt: "Small joys",
      entries: [
        {
          date: "2026-10-02",
          text: "Breakfast by the open window.",
          tags: [],
          photo: "lib:parks",
          goto: "oct_02",
        },
      ],
    },
    {
      id: "s1",
      c: "SleepLog",
      style: "stages",
      bed: "22:45",
      wake: "06:45",
      stages: { deep: 80, rem: 110, light: 260, awake: 30 },
      hrAvg: 61,
      hrv: 48,
      goto: "sleep_log",
    },
  ],
};

createRoot(document.body).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      screen={location.search ? records : sessions}
      theme={theme}
      onLink={(goto) => {
        document.body.dataset.destination = goto;
      }}
    />
  </TamaguiProvider>,
);
