import { describe, expect, it } from "vitest";
import { components, createRegistry, readComponent, type CastLike } from "@lmthing/ui/catalog";

const { meta, props, examples, probes, fallback } = components.SignInOptions;
const email = { provider: "email", goto: "email_signin" };

describe("SignInOptions", () => {
  it.each(examples)("accepts every example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it.each([
    { items: [] },
    { items: [email, email] },
    { items: [email, email, email, email, email] },
    { items: [{ ...email, provider: "other" }] },
    { items: [{ provider: "email" }] },
    { items: [{ ...email, goto: "https://example.test" }] },
    { items: [{ ...email, logo: "custom" }] },
    { items: [email], divider: "a".repeat(13) },
  ])("rejects invalid props", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it("uses a neutral, valid fallback with empty, real and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "plant", fields: ["name"] }], items: [] },
      { things: [{ type: "", fields: [""] }], items: [] },
    ];
    for (const cast of casts)
      expect(props.parse(fallback({ cast })).items).toEqual([{ provider: "email", goto: "signin" }]);
  });

  it("reads provider labels and the same addresses in both details", () => {
    const full = readComponent(components.SignInOptions, examples[0], "s1").join("\n");
    const brief = readComponent(components.SignInOptions, examples[2], "s1").join("\n");
    expect(full).toContain('"or"');
    expect(brief).not.toContain('"or"');
    for (const reading of [full, brief]) {
      expect(reading).toContain("Continue with Google");
      expect(reading).toContain("[s1/r2 press");
      expect(reading).toContain("google_signin");
    }
  });

  it("declares the service tier and choose, write and read probes", () => {
    expect(meta.tier).toBe("service");
    expect(probes.filter(({ kind }) => kind === "choose")).toHaveLength(2);
    expect(probes.some((probe) => probe.kind === "choose" && probe.expect === "Actions")).toBe(true);
    expect(probes.some((probe) => probe.kind === "write" && probe.expect === "SignInOptions")).toBe(true);
    expect(probes.some((probe) => probe.kind === "read" && probe.expect.action === "press")).toBe(true);
    expect(createRegistry({ includeDrafts: true }).schema("SignInOptions")).toBe(props);
  });
});
