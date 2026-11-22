import { describe, expect, it } from "vitest";
import { previewSignature, signatureDisplay, signatureHost, signatureReading } from "../../copy";

const input = { document: "local:original", signer: "Test signer" };
const draft = { version: "v1", revision: "stroke1", mark: "local:test_mark" };
const reviewed = { ...input, instance: "c1", version: "v1", openedVersion: "v1", reviewedVersion: "v1" };
const resolve = (...forms: unknown[]) => signatureHost(input, "c1", { signatureForms: forms });

describe("Signature host projection", () => {
  it("holds the draft and date only for the opened and reviewed current version", () => {
    expect(resolve({ ...reviewed, draft, saved: { version: "v1", date: "2026-10-04" } })).toMatchObject({
      opened: true,
      reviewed: true,
      draft,
      savedOn: "2026-10-04",
    });
    expect(resolve({ ...reviewed, version: "v2", openedVersion: "v2", draft })).toMatchObject({
      opened: true,
      reviewed: false,
      draft: undefined,
    });
    expect(
      resolve({
        ...reviewed,
        draft: { ...draft, version: "v0" },
        saved: { version: "v0", date: "2026-10-04" },
      }),
    ).toMatchObject({ reviewed: true, draft: undefined, savedOn: undefined });
  });

  it("fails closed on foreign, malformed, or ambiguous snapshots", () => {
    for (const forms of [
      [],
      [{ ...reviewed, instance: "c2" }],
      [{ ...reviewed, signer: "Another signer" }],
      [{ ...reviewed, document: "local:other" }],
      [{ ...reviewed, draft: { ...draft, mark: "lib:other" } }],
      [{ ...reviewed, saved: { version: "v1", date: "2026-02-30" } }],
      [reviewed, reviewed],
    ])
      expect(resolve(...forms)).toMatchObject({ opened: false, reviewed: false, draft: undefined });
    expect(resolve({ ...reviewed, openedVersion: undefined, draft }).draft).toBeUndefined();
  });

  it("keeps saved copy and failure copy grounded in the authoritative snapshot", () => {
    const data = previewSignature({ input, state: "success" });
    const display = signatureDisplay(input.signer, "success", signatureHost(input, "c1", data), "en-GB");
    expect(display.feedback).toMatchObject({ part: "success", title: "Signed copy saved" });
    expect(display.feedback?.sub).toContain("20 Nov");
    expect(signatureDisplay(input.signer, "success", resolve()).feedback?.part).toBe("error");
    expect(signatureDisplay(input.signer, "error", resolve()).feedback?.sub).toBe(
      "The original hasn’t changed.",
    );
    const error = (action: "open" | "save") =>
      signatureDisplay(input.signer, "error", resolve({ ...reviewed, failure: { version: "v1", action } }))
        .feedback?.title;
    expect(error("open")).toBe("Couldn’t open the original");
    expect(error("save")).toBe("Couldn’t save the signed copy");
  });

  it("summarizes the existence of private content without its reference", () => {
    expect(
      signatureReading({ signer: input.signer, document: input.document, has_mark: true, draft }, "filled"),
    ).toEqual([
      "(private file)",
      "Signer: Test signer",
      "(private mark)",
      "Open original",
      "I’ve reviewed the original",
      "Save signed copy",
      "Clear",
      "Draft signature",
    ]);
  });

  it("will not adopt a draft or saved copy from different signing options", () => {
    const options = { style: "initials", datedStamp: true };
    const saved = { ...reviewed, draft, saved: { version: "v1", date: "2026-10-04" } };
    for (const other of [{}, { style: "initials" }, { datedStamp: true }]) {
      const host = signatureHost({ ...input, ...options }, "c1", {
        signatureForms: [{ ...saved, ...other }],
      });
      expect(host).toMatchObject({ reviewed: false, draft: undefined, savedOn: undefined });
    }
    const host = signatureHost({ ...input, ...options }, "c1", {
      signatureForms: [{ ...saved, ...options }],
    });
    expect(host).toMatchObject({ reviewed: true, draft, savedOn: "2026-10-04" });
    const reading = signatureReading({ ...input, ...options, ...host }, "success", "en-GB");
    expect(reading).toContain("Initialed copy saved");
    expect(reading.some((line) => line.includes("Date stamped on the copy"))).toBe(true);
    expect(reading.join("\n")).not.toContain(draft.mark);
  });
});
