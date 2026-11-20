// PKCE (RFC 7636, S256) for OpenRouter's browser sign-in: no server and no client secret.

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** A fresh random code verifier: 32 random bytes as base64url, 43 characters. */
export function makeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** The S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}
