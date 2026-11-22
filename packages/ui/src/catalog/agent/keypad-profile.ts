import type { Definition } from "../probes";
import type { Affordance } from "./affordances";
import type { Values } from "./act";

/** An exact text draft, not an amount. Length and characters count Unicode code points. */
export type KeypadProfile = Readonly<{ characters: string; maxLength: number }>;
export type KeypadEdit = string | { append: string } | { backspace: true } | { clear: true };

export function keypadProfileAt(schema: Definition["props"] | undefined, part: string) {
  const profiles = schema?.meta()?.keypadProfiles as Record<string, KeypadProfile> | undefined;
  return profiles && Object.hasOwn(profiles, part) ? profiles[part] : undefined;
}

export function isKeypadPart(schema: Definition["props"] | undefined, part: string) {
  const parts = schema?.meta()?.keypadParts;
  return Boolean(keypadProfileAt(schema, part)) || (Array.isArray(parts) && parts.includes(part));
}

export function keypadOffers(
  offers: Affordance[],
  schema: Definition["props"] | undefined,
  instance: string,
  props: Values,
  items: Values[],
) {
  if (!schema?.meta()?.keypadProfiles) return offers;
  return offers.map((offer) => {
    if (offer.hostSecret || offer.action !== "type") return offer;
    const profile = keypadProfileAt(schema, offer.part);
    if (!profile) return offer;
    const own = offer.part === "root" ? instance : `${instance}/${offer.part}`;
    const item = offer.address.split("/")[1];
    const initial = (offer.address === own ? props : items.find(({ id }) => id === item))?.value;
    return { ...offer, keypad: { profile, initial: typeof initial === "string" ? initial : "" } };
  });
}

export function resolveTextKeypad(value: unknown, current: unknown, profile: KeypadProfile) {
  const invalid = {
    code: "invalid_value",
    hint: "Use the declared keypad characters or a keypad edit",
  } as const;
  const { characters, maxLength } = profile;
  if (typeof characters !== "string" || !characters || !Number.isSafeInteger(maxLength) || maxLength < 1)
    return invalid;
  const allowed = new Set(characters);
  const before = typeof current === "string" ? current : "";
  let text: string;
  if (typeof value === "string") text = value;
  else if (value && typeof value === "object" && Object.keys(value).length === 1) {
    if ("append" in value && typeof value.append === "string" && allowed.has(value.append))
      text = before + value.append;
    else if ("backspace" in value && value.backspace === true) text = [...before].slice(0, -1).join("");
    else if ("clear" in value && value.clear === true) text = "";
    else return invalid;
  } else return invalid;
  let length = 0;
  for (const char of text) {
    if (!allowed.has(char)) return invalid;
    if (++length > maxLength)
      return { code: "invalid_value" as const, hint: `Use at most ${maxLength} characters` };
  }
  return { value: text };
}
