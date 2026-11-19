import { languageLookup } from "../../../catalog";
import { en, type KitchenWords } from "./en";

export type { KitchenWords } from "./en";
const lookup = languageLookup<KitchenWords>(en);
export const kitchenWordsFor = lookup.words;
export const registerKitchenWords = lookup.register;
