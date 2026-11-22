import type { ComponentProps } from "react";
import {
  KitAction,
  KitActionFooter,
  KitContent,
  KitLayoutText,
  KitPhoto,
  KitRow,
  type LayoutLine,
} from "../base";
import { PartContext, usePartContext } from "../part";

type FeedPhoto = Omit<ComponentProps<typeof KitPhoto>, "loading">;
type FeedAction = ComponentProps<typeof KitAction> & { part: string };
export type FeedRowData = {
  item: string;
  label: string;
  part?: string;
  goto?: string;
  indent?: 0 | 1;
  avatar?: FeedPhoto;
  author?: LayoutLine;
  time?: LayoutLine;
  title?: LayoutLine;
  body?: LayoutLine;
  status?: LayoutLine;
  media?: FeedPhoto;
  accessories?: readonly FeedAction[];
};
export type FeedDensity = ComponentProps<typeof KitRow>["density"];

/** The owner supplies formatted copy and existing targets; controls sit outside the row link. */
export function FeedRow({ row, density }: { row: FeedRowData; density?: FeedDensity }) {
  const context = usePartContext();
  const loading = context.state === "loading";
  const {
    item,
    part = "root",
    label,
    indent,
    goto,
    avatar,
    author,
    time,
    title,
    body,
    status,
    media,
    accessories,
  } = row;
  const lead = avatar && (
    <KitPhoto shape="round" {...avatar} part={loading ? null : (avatar.part ?? null)} loading={loading} />
  );
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <KitRow
        part={loading ? null : part}
        label={label}
        goto={loading ? undefined : goto}
        leading={lead}
        leadingAlign="row"
        inset="none"
        density={density}
        {...(indent ? { indent } : {})}
      >
        <KitContent density={density}>
          {[author, time, title, body, status].map(
            (line, index) => line && <KitLayoutText key={index} line={line} density={density} />,
          )}
          {media && (
            <KitPhoto
              shape="wide"
              {...media}
              part={loading ? null : (media.part ?? null)}
              loading={loading}
            />
          )}
        </KitContent>
      </KitRow>
      {accessories?.length ? (
        <KitActionFooter density={density} indent={indent}>
          {accessories.map((action) => (
            <KitAction key={action.part} contentParts={{}} {...action} part={loading ? null : action.part} />
          ))}
        </KitActionFooter>
      ) : null}
    </PartContext.Provider>
  );
}
