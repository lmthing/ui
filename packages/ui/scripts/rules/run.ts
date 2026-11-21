import { fileURLToPath, URL } from "node:url";
import { checkRules, countViolations, formatRules } from "./index";

const root = fileURLToPath(new URL("../../", import.meta.url));
const issues = await checkRules(root);
console.log(formatRules(root, issues));
process.exitCode = countViolations(issues) ? 1 : 0;
