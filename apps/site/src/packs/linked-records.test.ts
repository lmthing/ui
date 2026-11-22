import { packExamples } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { cleanScreen, screenOfLines } from "../live/screen";
import { linkedRecords } from "./linked-records";

const example = (id: "commerce" | "paperwork" | "invest") =>
  cleanScreen(screenOfLines(`${id}_app`, packExamples[id].trim().split("\n")));

it("uses the active cart's quantity and delivery, and clears checkout for an empty cart", () => {
  const screen = example("commerce");
  expect(linkedRecords(screen)).toEqual({ basket: [{ total: 16 }] });
  const cart = screen.components.find(({ c }) => c === "Cart")!;
  cart.delivery = 3;
  expect(linkedRecords(screen)).toEqual({ basket: [{ total: 19 }] });
  cart.state = "empty";
  expect(linkedRecords(screen)).toEqual({ basket: [] });
});

it("overlays receipt review without changing evidence tags or the original screen", () => {
  const screen = example("paperwork");
  const receipts = screen.components.find(({ c }) => c === "Receipts")!;
  receipts.detail = "brief";
  const evidence = (values = {}) =>
    linkedRecords(screen, values)?.paperwork_evidence?.find(
      (row) => row && typeof row === "object" && "file" in row && row.file === "lib:trot_training",
    );
  expect(evidence()).toMatchObject({ reviewed: false, tags: ["expenses", "fees"] });
  expect(evidence({ "paperwork_app/r2/$check/r5/reviewed": true })).toMatchObject({
    reviewed: true,
    tags: ["expenses", "fees"],
  });
  expect(evidence()).toMatchObject({ reviewed: false });
  expect(linkedRecords(example("invest"))).toBeUndefined();
});
