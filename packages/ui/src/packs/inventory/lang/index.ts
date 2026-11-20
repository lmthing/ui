import { languageLookup } from "../../../catalog";
import { en, type InventoryWords } from "./en";

export type { InventoryWords } from "./en";
const lookup = languageLookup<InventoryWords>(en);
export const inventoryWordsFor = lookup.words;
export const registerInventoryWords = lookup.register;
