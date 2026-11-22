import type { Values } from "../../../catalog";
import * as kit from "../../../kit";
import { quizKey, quizMatches, quizOrderCopy, type QuizItem } from "../copy";
import { learningWordsFor } from "../lang";

// prettier-ignore
export function Options({ labels, part, title, selected, binary, active = true }: {
  labels: string[]; part: "root" | "left" | "right"; title: string; selected?: unknown; binary?: boolean; active?: boolean;
}) {
  const chips = labels.map((label, index) =>
    <kit.KitChip key={index} item={null} part={active ? "root" : null} value={quizKey(part, index)}
      label={label} role="radio" on={index === selected} />);
  if (part !== "root") return <kit.KitContent rhythm="flush">
    <kit.KitContent inset="md">
      <kit.KitText role="label" tone="muted" part={null}>{title}</kit.KitText>
    </kit.KitContent>
    <kit.KitTrack part={part} role="radiogroup" label={title}>
      <kit.KitGrid arrange="rows" list>{chips}</kit.KitGrid>
    </kit.KitTrack>
  </kit.KitContent>;
  return <kit.KitTrack part={part} role="radiogroup" label={title}>
    {binary ? <kit.KitGrid>{chips}</kit.KitGrid> : chips}
  </kit.KitTrack>;
}

type ActiveQuestion = { item: QuizItem; answers: Readonly<Values> };

// prettier-ignore
export function MatchChoices({ item, answers }: ActiveQuestion) {
  const { lang, words: { quiz } } = kit.useWords(learningWordsFor);
  const active = answers.left !== undefined;
  const labels = quizMatches(item, answers, lang);
  return <kit.KitContent>
    <kit.KitText role="label" tone="muted" part={null}>{active ? quiz.pickRight : quiz.pickLeft}</kit.KitText>
    <kit.KitGrid>
      <Options part="left" title={quiz.left} labels={labels.left} selected={answers.left} />
      <Options part="right" title={quiz.right} labels={labels.right} active={active} />
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
export function OrderChoices({ item, answers }: ActiveQuestion) {
  const { lang, words: { quiz } } = kit.useWords(learningWordsFor);
  const { draft, tiles } = quizOrderCopy(item, answers, lang);
  return <kit.KitContent>
    <kit.KitLayoutText line={{ text: quiz.orderHint, role: "meta", tone: "muted", part: "order_hint" }} />
    {Boolean(draft) && <kit.KitMetaLine title={{ text: quiz.orderDraft, role: "meta", tone: "muted" }}
      meta={{ text: draft, part: "order_draft", role: "body", tone: "text" }} />}
    <kit.KitTrack part="root" label={quiz.wordBank}>
      {tiles.map(({ value, ...tile }) => <kit.KitChip key={value} item={null} value={value} role="checkbox" {...tile} />)}
    </kit.KitTrack>
  </kit.KitContent>;
}
