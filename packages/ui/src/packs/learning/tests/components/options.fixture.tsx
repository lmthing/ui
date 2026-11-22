import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, sessionKey, sessionState, type ScreenLike } from "@lmthing/ui/catalog";
import { createInteractionStore, PhoneScreen, type MediaAdapter } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

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
  components: [flashcard, quiz, { ...components.Path.examples[0]!, style: "modules", c: "Path", id: "path" }],
};
const interaction = createInteractionStore();
const cardSeed = components.Flashcard.props.parse({ cards: flashcard.cards, style: flashcard.style });
const quizSeed = components.Quiz.props.parse({ questions: quiz.questions });
const resolvePlayback = (address: string) => {
  const [, id, part] = address.split("/");
  if (part !== "audio") return;
  const stored = () => interaction.get(`home/${id}/${sessionKey}`);
  const round =
    id === "quiz"
      ? sessionState(components.Quiz.meta, quizSeed, stored)
      : id === "cards"
        ? sessionState(components.Flashcard.meta, cardSeed, stored)
        : undefined;
  if (round?.kind !== "rounds" || round.revealed) return;
  const clip = id === "quiz" ? round.item.media : round.item.audio;
  return typeof clip === "string" ? clip.replace("lib:", "") : undefined;
};
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
      {...{ screen, interaction, resolvePlayback, media }}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      onLink={(destination) => {
        document.body.dataset.link = destination;
      }}
      reduceMotion
    />
  </TamaguiProvider>,
);
