import { languageLookup } from "../../../catalog";
import { en, type CommunityWords } from "./en";

const lookup = languageLookup<CommunityWords>(en);
export const communityWordsFor = lookup.words;
export const registerCommunityWords = lookup.register;
