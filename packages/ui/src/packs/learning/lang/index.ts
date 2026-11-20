import { languageLookup } from "../../../catalog";
import { en, type LearningWords } from "./en";

const lookup = languageLookup<LearningWords>(en);
export const learningWordsFor = lookup.words;
