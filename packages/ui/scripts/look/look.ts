import { lookArgs, runLook } from "./component";

const issues = await runLook(lookArgs(process.argv.slice(2)));
const unique = new Map(issues.map((i) => [`${i.kind}|${i.part}|${i.detail}`, i]));
for (const i of unique.values())
  console.log(`ISSUE ${i.kind.padEnd(8)} ${i.width}px ${i.mode} ${i.frame} ${i.part}: ${i.detail}`);
console.log(
  issues.length ? `\n${unique.size} distinct issue(s), ${issues.length} in total.` : "\nNo issues.",
);
process.exit(issues.length ? 1 : 0);
