import { describe, expect, it } from "vitest";
import { challengeFor, makeVerifier } from "./pkce";

describe("pkce", () => {
  it("makes a 43-character base64url verifier", () => {
    const verifier = makeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(makeVerifier()).not.toBe(verifier);
  });
  it("matches the RFC 7636 S256 example", async () => {
    expect(await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});
