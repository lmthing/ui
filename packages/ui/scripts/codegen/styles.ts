import { variantAxes } from "../../src/catalog";
import { splitTop } from "./doc-section";

export function enumValues(source: string) {
  const entries = splitTop(source, ",|");
  const values = entries.flatMap((entry) => {
    const value = /^(?:`([a-z][a-z0-9_-]*)`|(-?\d+(?:\.\d+)?))(?=\s|$)/i.exec(entry);
    return value ? [value[1] ?? Number(value[2])] : [];
  });
  const marked = entries.find((entry) => /\bdefault\b/.test(entry));
  const defaultToken = /(?:^default\s+|[(]default\s+)`?(-?[a-z0-9_-]+)`?\s*\)?$/i.exec(marked ?? "")?.[1];
  const declaredDefault =
    defaultToken === undefined
      ? values[marked === undefined ? -1 : entries.indexOf(marked)]
      : (values.find((value) => String(value) === defaultToken) ??
        (/^-?\d+$/.test(defaultToken) ? Number(defaultToken) : defaultToken));
  if (declaredDefault !== undefined && !values.includes(declaredDefault)) {
    if (marked?.startsWith("default ")) values.push(declaredDefault);
    else throw new Error(`Default is not in the choices: ${source}`);
  }
  if (
    entries.some(
      (entry) =>
        !/^(?:`[a-z][a-z0-9_-]*`|-?\d+(?:\.\d+)?)(?=\s|$)/i.test(entry) &&
        !/^default\s+`?[\w-]+`?$/.test(entry),
    )
  )
    throw new Error(`Unsupported choices: ${source}`);
  return { values: [...new Set(values)], declaredDefault };
}

export function readStyles(styles: string, variants: string) {
  const axes: Record<string, string[]> = {};
  const fields: Record<string, string[]> = {};
  const parts = [
    ...splitTop(splitTop(styles, ".")[0] ?? "", ";"),
    ...splitTop(splitTop(variants, ".")[0] ?? "", ";"),
  ];
  for (const part of parts) {
    const heading = /^(?:`?([a-z]+)`?\s*:\s*)?(.+)$/.exec(part)!;
    const key = heading[1] ?? "style";
    const { values, declaredDefault } = enumValues(heading[2]!);
    if (!values.length || !values.every((value) => typeof value === "string"))
      throw new Error(`No style or variant choices in ${part}`);
    const ordered =
      declaredDefault === undefined
        ? values
        : [String(declaredDefault), ...values.filter((value) => value !== declaredDefault)];
    if (Object.hasOwn(variantAxes, key)) {
      const allowed: readonly string[] = variantAxes[key as keyof typeof variantAxes].values;
      if (ordered.some((value) => !allowed.includes(value))) throw new Error(`Unknown ${key} value: ${part}`);
      axes[key] = ordered;
    } else if (key === "style" || key === "kind") fields[key] = ordered;
    else throw new Error(`Unknown style or variant field: ${key}`);
  }
  return { axes, fields };
}
