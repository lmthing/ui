import { languageLookup } from "../../../catalog";
import { en, type BooksWords } from "./en";

const lookup = languageLookup<BooksWords>(en);
export const booksWordsFor = lookup.words;
export const registerBooksWords = lookup.register;
