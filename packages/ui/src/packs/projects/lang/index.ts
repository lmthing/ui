import { languageLookup } from "../../../catalog";
import { en, type ProjectsWords } from "./en";

const lookup = languageLookup<ProjectsWords>(en);
export const projectsWordsFor = lookup.words;
export const registerProjectsWords = lookup.register;
