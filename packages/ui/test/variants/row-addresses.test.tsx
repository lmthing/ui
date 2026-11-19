import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { rowAddressIssues } from "./row-addresses";

const rows = [
  { id: "r1", title: "Alpha" },
  { id: "r2", title: "B&B" },
];
function render(items: typeof rows) {
  return renderToStaticMarkup(
    <div>
      {items.map(({ id, title }) => (
        <div key={id} data-testid={`home/c1/${id}/root`}>
          <span data-testid={`home/c1/${id}/title`}>{title}</span>
        </div>
      ))}
    </div>,
  );
}

it("permits visual reordering without letting a row take another row's address", () => {
  const ordered = render(rows);
  const reversed = [...rows].reverse();
  expect(rowAddressIssues(rows, ordered, render(reversed))).toEqual([]);
  const renumbered = reversed.map((row, index) => ({ ...row, id: `r${index + 1}` }));
  expect(rowAddressIssues(rows, ordered, render(renumbered))).toEqual([
    "Item content moved from r1 to r2",
    "Item content moved from r2 to r1",
  ]);
});

it("accepts a hidden suffix but catches a peek that shows the wrong first row", () => {
  expect(rowAddressIssues(rows, render(rows), render(rows.slice(0, 1)))).toEqual([]);
  expect(rowAddressIssues(rows, render(rows), render([{ ...rows[1]!, id: "r1" }]))).toEqual([
    "Item content moved from r2 to r1",
  ]);
});
