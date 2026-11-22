import { fileURLToPath } from "node:url";
import { splitSources } from "./split";

const root = fileURLToPath(new URL("../../", import.meta.url));
const count = await splitSources(root);
console.log(`Split component prompts and words: ${count} file(s) updated.`);
