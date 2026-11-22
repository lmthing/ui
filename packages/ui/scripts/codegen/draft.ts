import { componentSection } from "./doc-section";
import { readFields } from "./fields";
import { nearMiss, readMeta } from "./metadata";
import { componentSource, labelSources, testSource } from "./render";
import { readStyles } from "./styles";

export function draftComponent(doc: string, scope: string, name: string) {
  const core = scope === "core";
  const section = componentSection(doc, name);
  const { fields: styles, axes } = readStyles(
    section.sections.get("Styles") ?? "",
    section.sections.get("Variants") ?? "",
  );
  const fields = readFields(section.sections.get("Writes")!, styles, axes);
  const { meta, rowGroups } = readMeta(name, section, fields, axes);
  const near = nearMiss(section.sections.get("Pick") ?? "");
  const catalog = core ? "../catalog" : "../../../catalog";
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const labels = labelSources(meta);
  const base = core ? "src" : `src/packs/${scope}`;
  const labelBase = core ? "src/catalog" : base;
  const view = `${base}/components/${name}.tsx`;
  return {
    view,
    files: {
      [`${base}/${core ? "components" : "tests"}/${name}.test.ts`]: testSource(meta, fields, core),
      [`${labelBase}/copy/${core ? kebab : name}.ts`]: labels.copy,
      [`${labelBase}/lang/${kebab}.ts`]: labels.lang,
      [view]: componentSource(meta, fields, rowGroups, catalog, near, !core),
    },
  };
}
