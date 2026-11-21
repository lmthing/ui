import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lookArgs } from "./args";
import { runLook } from "./run-look";

it("captures only the calm light sheet, its marked copy, and the issues report by default", async () => {
  const out = mkdtempSync(join(tmpdir(), "look-single-"));
  try {
    writeFileSync(join(out, "390-dark.png"), "old shot");
    const issues = await runLook(lookArgs(["--component", "List"]), out);
    expect(readdirSync(out).sort()).toEqual(["390-light-marks.png", "390-light.png", "issues.json"]);
    expect(JSON.parse(readFileSync(join(out, "issues.json"), "utf8"))).toEqual(issues);
    for (const file of ["390-light.png", "390-light-marks.png"]) {
      const png = readFileSync(join(out, file));
      // A multi-column gallery expands the full-page PNG beyond the one-column viewport.
      expect(png.readUInt32BE(16)).toBe(510);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}, 60000);
