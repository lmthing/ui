import { learningWordsFor } from "../lang";

export function lessonReading(hasExample: boolean, lang?: string): string[] {
  const { lesson } = learningWordsFor(lang);
  return hasExample ? [lesson.example, lesson.next] : [lesson.next];
}
