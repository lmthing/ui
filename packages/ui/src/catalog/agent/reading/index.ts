type Props = Record<string, unknown>;
export type ReadSchema = {
  properties?: Record<string, ReadSchema>;
  items?: ReadSchema;
  kind?: string;
  default?: unknown;
  type?: string;
};

export function itemTexts(schema: ReadSchema | undefined, item: Props, nestedKey?: string): string[] {
  const nested =
    nestedKey && Array.isArray(item[nestedKey])
      ? (item[nestedKey] as Props[]).flatMap((child) =>
          textsOf(schema?.properties?.[nestedKey]?.items, child),
        )
      : [];
  return [...textsOf(schema, item), ...nested];
}

function textsOf(schema: ReadSchema | undefined, value: Props): string[] {
  return Object.entries(schema?.properties ?? {}).flatMap(([key, field]) => {
    const v = value[key];
    if (field.kind === "text" && typeof v === "string") return [JSON.stringify(v)];
    if (field.kind === "photo" && typeof v === "string") return [`photo:${v.replace(/^lib:/, "")}`];
    if (field.kind === "secret" && typeof v === "string") return ["(secret)"];
    if (field.type === "object" && v && typeof v === "object") return textsOf(field, v as Props);
    return [];
  });
}

export function componentTexts(
  schema: ReadSchema,
  props: Props,
  key?: string,
  roundKey?: string,
  round?: Props,
) {
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([k]) => k !== key && k !== roundKey),
  );
  return [
    ...textsOf({ properties }, props),
    ...(roundKey && round ? textsOf(schema.properties?.[roundKey]?.items, round) : []),
  ];
}
