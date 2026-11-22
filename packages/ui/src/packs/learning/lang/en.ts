import { words as AchievementsWords } from "./en/Achievements";
import { words as AssignmentsWords } from "./en/Assignments";
import { words as FlashcardWords } from "./en/Flashcard";
import { words as GradebookWords } from "./en/Gradebook";
import { words as LessonWords } from "./en/Lesson";
import { words as PathWords } from "./en/Path";
import { words as QuizWords } from "./en/Quiz";
import { words as ResultWords } from "./en/Result";
import { words as SpeechCheckWords } from "./en/SpeechCheck";
import { words as TimetableWords } from "./en/Timetable";
import { words as WorkedSolutionWords } from "./en/WorkedSolution";
export const en = {
  ...AchievementsWords,
  ...AssignmentsWords,
  ...FlashcardWords,
  ...GradebookWords,
  ...LessonWords,
  ...PathWords,
  ...QuizWords,
  ...ResultWords,
  ...SpeechCheckWords,
  ...TimetableWords,
  ...WorkedSolutionWords,
};

export type LearningWords = typeof en;
