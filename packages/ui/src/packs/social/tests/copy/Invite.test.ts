import { describe, expect, it } from "vitest";
import { inviteJoinedLine, inviteReading } from "../../copy";

describe("Invite copy", () => {
  it.each([
    [0, "0 people joined"],
    [1, "1 person joined"],
    [6, "6 people joined"],
  ])("uses the count grammar for %i", (joined, text) => {
    expect(inviteJoinedLine({ joined, detail: "full" }, "en")).toBe(text);
  });

  it("formats the count in the requested locale", () => {
    expect(inviteJoinedLine({ joined: 123456, detail: "full" }, "ar-EG")).toBe("١٢٣٤٥٦ people joined");
  });

  it("only reads visible lines and actions", () => {
    expect(inviteJoinedLine({ detail: "full" }, "en")).toBeUndefined();
    expect(inviteReading({ detail: "brief", joined: 4, qr: true }, "filled", "en")).toEqual([
      "Invite QR code",
      "Copy code",
      "Share invite",
    ]);
    expect(inviteReading({ detail: "full", qr: false }, "filled", "en")).toEqual([
      "Copy code",
      "Share invite",
    ]);
    expect(inviteReading({ detail: "full", joined: 4, qr: true }, "loading", "en")).toEqual([]);
  });
});
