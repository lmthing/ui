import { fileURLToPath, URL } from "node:url";
import { generateEntries } from "./entries";

await generateEntries(fileURLToPath(new URL("../../", import.meta.url)));
