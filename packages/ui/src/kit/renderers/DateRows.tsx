import { KitContent, KitLayoutText, KitRowGroup, type LayoutLine } from "../base";
import { PartContext, usePartContext } from "../part";
import { FeedRow, type FeedDensity, type FeedRowData } from "./FeedRow";

export type DateGroup = {
  id: string;
  date?: LayoutLine & { item?: string };
  rows: readonly FeedRowData[];
};

/** Date headings do not create child items or supply a missing event time. */
export function DateRows({ groups, density }: { groups: readonly DateGroup[]; density?: FeedDensity }) {
  const context = usePartContext();
  return groups
    .filter(({ rows }) => rows.length)
    .map(({ id, date, rows }, index) => (
      <KitContent key={id} group={index ? "response" : "content"} density={density}>
        {date && (
          <PartContext.Provider value={date.item === undefined ? context : { ...context, item: date.item }}>
            <KitLayoutText line={date} density={density} />
          </PartContext.Provider>
        )}
        <KitRowGroup density={density}>
          {rows.map((row) => (
            <FeedRow key={row.item} row={row} density={density} />
          ))}
        </KitRowGroup>
      </KitContent>
    ));
}
