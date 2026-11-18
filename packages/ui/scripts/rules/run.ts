import { fileURLToPath, URL } from "node:url";
import { checkRules, formatRules } from "./index";

const root = fileURLToPath(new URL("../../", import.meta.url));
const violations = await checkRules(root);
console.log(formatRules(root, violations));
process.exitCode = violations.length ? 1 : 0;
