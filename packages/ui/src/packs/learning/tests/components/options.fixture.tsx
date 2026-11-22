import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen, type MediaAdapter } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";
import { weekdays } from "../../copy";

const flashcard = {
  c: "Flashcard",
  id: "cards",
  style: "binary",
  cards: [
    { front: "First card", back: "First answer", audio: "lib:first" },
    { front: "Second card", back: "Second answer" },
    { front: "Third card", back: "Third answer", audio: "lib:third" },
  ],
};
const quiz = {
  c: "Quiz",
  id: "quiz",
  questions: [
    {
      kind: "order",
      question: "Put the tip in order.",
      words: ["fern.", "the", "Water"],
      answer: [2, 1, 0],
      media: "lib:arrange",
    },
    { kind: "truefalse", question: "Is this the next question?", answer: true, media: "lib:confirm" },
  ],
};
const screen: ScreenLike = {
  id: "home",
  components: [
    flashcard,
    quiz,
    { ...components.Path.examples[0]!, style: "modules", c: "Path", id: "path" },
    {
      c: "Timetable",
      id: "schedule",
      selected_day: "mon",
      days: weekdays.map((day) => ({ day, periods: [{ time: "09:00", subject: `Class ${day}` }] })),
    },
    {
      ...components.Assignments.examples[0]!,
      c: "Assignments",
      id: "assignments",
    },
  ],
};
const clips: Record<string, string> = {
  "home/cards/audio": "first",
  "home/cards/audio_3": "third",
  "home/quiz/audio": "arrange",
  "home/quiz/audio_2": "confirm",
};
const resolvePlayback = (address: string) => clips[address];
const media: MediaAdapter = {
  open(reference) {
    return {
      play: () => {
        document.body.dataset.playing = reference;
      },
      pause: () => {
        delete document.body.dataset.playing;
      },
      dispose: () => {
        delete document.body.dataset.playing;
      },
      seek() {},
    };
  },
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      {...{ screen, resolvePlayback, media }}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      onLink={(destination) => {
        document.body.dataset.link = destination;
      }}
      reduceMotion
    />
  </TamaguiProvider>,
);
