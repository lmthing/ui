import { isKeypadPart, type Definition, type Values } from "../../../catalog";

export function hasKeypads(def?: Definition) {
  const schema = def?.props.meta();
  return Array.isArray(schema?.keypadParts) || Boolean(schema?.keypadProfiles);
}

function projectValue(input: Values, address: string, parts: readonly string[], values: Values): Values {
  for (const part of parts) {
    const draft = values[part === "root" ? address : `${address}/${part}`];
    if (typeof draft === "string") return { ...input, value: draft };
  }
  return input;
}

/** Project exact keypad drafts only into `meta.read`, not into numeric wire props. */
export function withKeypadDrafts(def: Definition, address: string, values: Values): Definition {
  const read = def.meta.read;
  if (!read || !hasKeypads(def)) return def;
  const actions = def.meta.actions;
  const own = Object.keys(actions?.parts ?? {}).filter(
    (part) => isKeypadPart(def.props, part) && !Object.hasOwn(actions?.privateInput ?? {}, part),
  );
  const itemParts = Object.keys(actions?.items ?? {}).filter((part) => isKeypadPart(def.props, part));
  return {
    ...def,
    meta: {
      ...def.meta,
      read: (input, state, lang, deviceData, currency, get) => {
        const projected = projectValue(input as Values, address, own, values);
        const items = def.meta.items?.key;
        const rows = items && projected[items];
        if (!items || !Array.isArray(rows) || !itemParts.length)
          return read(projected, state, lang, deviceData, currency, get);
        return read(
          {
            ...projected,
            [items]: rows.map((row: Values) =>
              projectValue(row, `${address}/${String(row.id)}`, itemParts, values),
            ),
          },
          state,
          lang,
          deviceData,
          currency,
          get,
        );
      },
    },
  };
}
