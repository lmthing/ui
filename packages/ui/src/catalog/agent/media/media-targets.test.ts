import { expect, it } from "vitest";
import { attachmentOwner, mediaOffer, validMediaReference } from "./media-targets";
import type { Meta } from "../../meta";

it("recognizes named and root parts at the correct owner", () => {
  const meta = {
    media: { attachments: { root: { intent: "pick" } } },
    items: {
      key: "rows",
      parts: ["root", "preview"],
      media: { attachments: { root: { intent: "scan" }, preview: { intent: "preview", source: "root" } } },
    },
  } satisfies Pick<Meta, "media" | "items">;
  const pick = mediaOffer(meta, "m", { address: "m", part: "root", action: "press" });
  const scan = mediaOffer(meta, "m", { address: "m/r1", part: "root", action: "scan" });
  const preview = mediaOffer(meta, "m", { address: "m/r1/preview", part: "preview", action: "press" });
  expect(pick?.kind === "attachment" && attachmentOwner(pick)).toBe("m");
  expect(scan?.kind === "attachment" && attachmentOwner(scan)).toBe("m/r1");
  expect(preview?.kind === "attachment" && attachmentOwner(preview)).toBe("m/r1");
  expect(mediaOffer(meta, "m", { address: "m/r1", part: "root", action: "press" })).toBeUndefined();
});

it("admits opaque tokens, not unbounded or path-shaped references", () => {
  for (const value of ["a", "a-b_C7", "a".repeat(128)]) expect(validMediaReference(value)).toBe(true);
  for (const value of ["", "a".repeat(129), "data:image/png", "/", "C:\\Users", "a\n", 7])
    expect(validMediaReference(value)).toBe(false);
});
