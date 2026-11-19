import {
  migrateScreen,
  readComponent,
  readScreen,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../../catalog";

// Match quoted content as one token so a label cannot be mistaken for an affordance.
const typeTokens = /"(?:\\.|[^"\\])*"| \[([\w/-]+) type(?: = "(?:\\.|[^"\\])*")?(?: !needs-[a-z]+)?\]/g;

function projectValue(input: Values, address: string, parts: readonly string[], values: Values): Values {
  for (const part of parts) {
    const draft = values[part === "root" ? address : `${address}/${part}`];
    if (typeof draft === "string") return { ...input, value: draft };
  }
  return input;
}

/** Project exact keypad drafts only into `meta.read`, not into numeric wire props. */
function withKeypadDrafts(def: Definition, address: string, values: Values): Definition {
  const read = def.meta.read;
  const parts = def.props.meta()?.keypadParts;
  if (!read || !Array.isArray(parts)) return def;
  return {
    ...def,
    meta: {
      ...def.meta,
      read: (input, state, lang) => {
        const own = Object.keys(def.meta.actions?.parts ?? {}).filter((part) => parts.includes(part));
        const projected = projectValue(input as Values, address, own, values);
        const items = def.meta.items?.key;
        const rows = items && projected[items];
        if (!items || !Array.isArray(rows)) return read(projected, state, lang);
        const itemParts = Object.keys(def.meta.actions?.items ?? {}).filter((part) => parts.includes(part));
        return read(
          {
            ...projected,
            [items]: rows.map((row: Values) =>
              projectValue(row, `${address}/${String(row.id)}`, itemParts, values),
            ),
          },
          state,
          lang,
        );
      },
    },
  };
}

export function readControls(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  lang?: string,
  disabled?: ReadonlyMap<string, symbol>,
): string {
  const migrated = migrateScreen(screen, { variantOnly: true });
  const hasKeypads = migrated.components.some(({ c }) => Array.isArray(defs[c]?.props.meta()?.keypadParts));
  const read = hasKeypads
    ? readKeypads(migrated, defs, values, lang)
    : readScreen(screen, defs, values, lang);
  return disabled?.size
    ? read.replace(typeTokens, (token, address) => (disabled.has(address) ? "" : token))
    : read;
}

function readKeypads(screen: ScreenLike, defs: Record<string, Definition>, values: Values, lang?: string) {
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = readScreen({ ...screen, components: [] }, defs, values, lang);
  return [
    header,
    ...screen.components.flatMap(({ id, c, state, ...props }) => {
      const def = defs[c];
      return def
        ? readComponent(withKeypadDrafts(def, id, local), props, id, state, local, lang)
        : [`${id} ${c} (unknown)`];
    }),
  ].join("\n");
}
