import type { Definition } from "../probes";

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

export function resolveTextKeypad(value: unknown, current: unknown, profile: KeypadProfile) {
  const allowed = new Set(profile.characters);
  const before = typeof current === "string" ? current : "";
  const invalid = {
    code: "invalid_value",
    hint: "Use the declared keypad characters or a keypad edit",
  } as const;
  let text: string;
  if (typeof value === "string") text = value;
  else if (value && typeof value === "object" && Object.keys(value).length === 1) {
    if ("append" in value && typeof value.append === "string" && allowed.has(value.append))
      text = before + value.append;
    else if ("backspace" in value && value.backspace === true) text = [...before].slice(0, -1).join("");
    else if ("clear" in value && value.clear === true) text = "";
    else return invalid;
  } else return invalid;
  const chars = [...text];
  if (
    !allowed.size ||
    !Number.isSafeInteger(profile.maxLength) ||
    profile.maxLength < 1 ||
    chars.some((char) => !allowed.has(char))
  )
    return invalid;
  if (chars.length > profile.maxLength)
    return { code: "invalid_value" as const, hint: `Use at most ${profile.maxLength} characters` };
  return { value: text };
}
