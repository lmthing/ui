import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type Entry = { name: string; likes: number; reply: boolean };

export function commentLikeCopy(likes: number, lang?: string) {
  const count = numberLine(likes, lang);
  const { before = "", after = "" } = socialWordsFor(lang).feed.likes(pluralForm(likes, lang));
  return { count, line: before + count + after };
}

export function commentReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { comments } = input as { comments: Entry[] };
  const words = socialWordsFor(lang);
  let parent: string | undefined;
  const entries = comments.map(({ name, likes, reply }, index) => {
    if (!reply) parent = name;
    const author = reply && parent ? words.comments.replyAuthor(name, parent) : name;
    return `r${index + 1}: ${[author, commentLikeCopy(likes, lang).line].join(words.feed.countSeparator)}`;
  });
  return [...entries, words.comments.reply];
}
