import { languageLookup } from "../../../catalog";
import { en, type SocialWords } from "./en";

export type { SocialWords } from "./en";
const lookup = languageLookup<SocialWords>(en);
export const socialWordsFor = lookup.words;
export const registerSocialWords = lookup.register;
