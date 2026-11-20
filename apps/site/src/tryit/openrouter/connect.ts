// OpenRouter sign-in with PKCE: send the visitor to openrouter.ai, then trade the returned code for a key.
import { challengeFor, makeVerifier } from "./pkce";
import { saveKey } from "./key";

const verifierSlot = "lmthing-openrouter-verifier";
export const authUrl = "https://openrouter.ai/auth";
export const keysUrl = "https://openrouter.ai/api/v1/auth/keys";

/** The page OpenRouter sends the visitor back to: this page without hash or query (OpenRouter adds ?code=). */
export const callbackUrl = () => `${location.origin}${location.pathname}`;

/** Sends the visitor to OpenRouter to approve a key for this site. */
export async function startConnect(go: (url: string) => void = (url) => location.assign(url)) {
  const verifier = makeVerifier();
  sessionStorage.setItem(verifierSlot, verifier);
  const query = new URLSearchParams({
    callback_url: callbackUrl(),
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
  });
  go(`${authUrl}?${query}`);
}

/**
 * On the return from OpenRouter: drop the code from the address bar at once, land on the Try section, then
 * trade the code for the visitor's key. Returns a promise of the outcome, or null when this is not a return.
 */
export function finishConnect(fetchImpl: typeof fetch = fetch): Promise<string> | null {
  const code = new URLSearchParams(location.search).get("code");
  const verifier = readVerifier();
  if (!code || !verifier) return null;
  sessionStorage.removeItem(verifierSlot);
  history.replaceState(null, "", `${location.pathname}#try`);
  returning = exchange(fetchImpl, code, verifier);
  returning.catch(() => undefined); // reported by the panel through pendingConnect()
  return returning;
}

let returning: Promise<string> | null = null;
/** The sign-in exchange started at page load, so the panel can report it when it mounts. */
export const pendingConnect = () => returning;

function readVerifier() {
  try {
    return sessionStorage.getItem(verifierSlot);
  } catch {
    return null;
  }
}

async function exchange(fetchImpl: typeof fetch, code: string, verifier: string): Promise<string> {
  const response = await fetchImpl(keysUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
  });
  const body = (await response.json().catch(() => ({}))) as { key?: string; error?: { message?: string } };
  if (!response.ok || !body.key) throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  saveKey(body.key);
  return body.key;
}
