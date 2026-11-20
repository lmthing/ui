// The visitor's own OpenRouter key: kept only in this browser, sent only to openrouter.ai.

const slot = "lmthing-openrouter-key";
/** Fired on window when the key is set or cleared, so an open panel updates (also after the sign-in return). */
export const keyEvent = "lmthing:openrouter-key";

export function readKey(): string | null {
  try {
    return localStorage.getItem(slot);
  } catch {
    return null;
  }
}

export function saveKey(key: string | null): void {
  try {
    if (key) localStorage.setItem(slot, key);
    else localStorage.removeItem(slot);
  } catch {
    /* storage can be blocked; the key then lasts only for this page */
  }
  dispatchEvent(new CustomEvent(keyEvent, { detail: key }));
}

/** "sk-or-v1-…wxyz": enough to recognise the key, never enough to use it. */
export function maskKey(key: string): string {
  const head = key.startsWith("sk-or-") ? key.slice(0, key.indexOf("-", 6) + 1) : "";
  return `${head}…${key.slice(-4)}`;
}

/** A pasted key looks plausible: OpenRouter keys start with sk-or-. */
export const looksLikeKey = (text: string) => /^sk-or-[\w-]{20,}$/.test(text.trim());
