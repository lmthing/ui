import { languageLookup } from "../../../catalog";
import { en, type TeamWords } from "./en";

export type { TeamWords } from "./en";
const lookup = languageLookup<TeamWords>(en);
export const teamWordsFor = lookup.words;
export const registerTeamWords = lookup.register;
