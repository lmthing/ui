import type { SiteData } from "../site-types";
import { cat } from "./catalog";

/** Every example and every worked-example line must validate against the catalog schema, or the build fails. */
export function validateExamples(data: SiteData): void {
  const failures: string[] = [];
  const check = (where: string, c: string, props: unknown) => {
    const def = cat.components[c];
    const result = def?.props.safeParse(props);
    if (!result?.success) {
      const issue = result?.error?.issues[0];
      failures.push(
        `${where}: ${c}${issue ? ` ${issue.path.join(".")} ${issue.message}` : " is not in the catalog"}`,
      );
    }
  };
  for (const item of data.items) {
    cat.components[item.id]?.examples.forEach((example, at) =>
      check(`${item.id} example ${at + 1}`, item.id, example),
    );
  }
  for (const pack of data.packs) {
    pack.lines.forEach((line, at) => {
      const { id: _id, c, ...props } = JSON.parse(line) as { id: string; c: string };
      check(`${pack.id} example.jsonl line ${at + 1}`, c, props);
    });
  }
  if (failures.length) throw new Error(`Examples that do not validate:\n${failures.join("\n")}`);
}
