import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { stampItemIds, themeName, type StateName } from "@lmthing/ui/catalog";
import {
  KitAction,
  KitActionFooter,
  KitCard,
  KitChip,
  KitColumns,
  KitEmpty,
  KitFigure,
  KitGrid,
  KitHeader,
  KitHours,
  KitInput,
  KitLayoutText,
  KitMetaLine,
  KitPhoto,
  KitProvider,
  KitRow,
  KitRowGroup,
  KitRouteStop,
  KitSeatGrid,
  KitSkeleton,
  KitState,
  KitStepper,
  KitStrip,
  KitTable,
  KitText,
  KitTrack,
  KitTrail,
  KitWeekMatrix,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../../render";
import { Article, meta as articleMeta, props as articleProps } from "../../../src/components/Article";
import { Button, props as buttonProps } from "../../../src/components/Button";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const sample = [
  { id: "r1", title: "One row with a longer title", meta: "A detail that belongs to this row", value: "12" },
  { id: "r2", title: "An equally long second title", value: "95" },
] as const;

function Rows({ loading }: { loading: boolean }) {
  return (
    <KitRowGroup leadingWidth="avatar">
      {sample.map((row, index) => (
        <KitRow
          key={row.id}
          item={row.id}
          part={loading ? null : "root"}
          label={row.title}
          inset="none"
          leading={
            index === 0 ? (
              <KitPhoto shape="round" part={loading ? null : "photo"} initials="R" loading={loading} />
            ) : undefined
          }
          trailing={<KitTrail kind="value" value={row.value} part="value" />}
        >
          <KitMetaLine
            title={{ text: row.title, part: "title" }}
            meta={{ text: "meta" in row ? row.meta : undefined, part: "meta" }}
          />
        </KitRow>
      ))}
    </KitRowGroup>
  );
}

function Recipes({ state }: { state: StateName }) {
  const loading = state === "loading";
  const content = (
    <>
      <KitHeader title={{ text: "Summary", part: "title" }} />
      <Rows loading={loading} />
      <div data-testid="narrow-slot">
        <KitGrid columns={3}>
          <KitLayoutText line={{ text: "1200 appointments", part: "count" }} />
        </KitGrid>
      </div>
      <KitFigure
        value={{ text: "192", part: "amount" }}
        unit={{ text: "kg", part: "unit" }}
        caption={<KitLayoutText line={{ text: "Caption", part: "caption", role: "caption" }} />}
      />
      <KitActionFooter>
        <KitAction part={loading ? null : "save"} label="Save summary" kind="secondary" />
      </KitActionFooter>
    </>
  );
  return (
    <PartScope screen="fixture" component="recipes" state={state} rev={1}>
      <KitCard padded>
        <KitState part="notice" retain loading={content}>
          {content}
        </KitState>
      </KitCard>
    </PartScope>
  );
}

const columns = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Extra"].map((label) => ({
  id: label,
  label,
  header: <KitText part={null}>{label}</KitText>,
}));
const matrix = {
  columns,
  rows: [
    {
      id: "r1",
      label: "Pinned rail",
      heading: <KitText part="heading">Pinned rail</KitText>,
      cells: columns.map(({ id }, index) => ({
        id,
        content: <KitText part={null}>{index + 1}</KitText>,
        target: { item: "r1", part: id.toLowerCase() },
      })),
    },
  ],
};

function Links({ state }: { state: StateName }) {
  return (
    <PartScope screen="fixture" component="links" state={state} rev={1}>
      <KitCard padded>
        <KitText part="paragraph">
          <KitText part="before">Read</KitText>{" "}
          <KitText item="r1" goto="first">
            it
          </KitText>{" "}
          <KitText item="r2" goto="second">
            next
          </KitText>{" "}
          <KitText part="after">before you go.</KitText>
        </KitText>
        <KitText part={null}>
          <KitText item="r3" goto="long">
            {"LongUnbrokenLabel".repeat(6)}
          </KitText>
        </KitText>
      </KitCard>
    </PartScope>
  );
}

function Articles({ state }: { state: StateName }) {
  const short = "See [it](screen:first) next.";
  const long = `Open [${"LongUnbrokenLabel".repeat(6)}](screen:long) for the next step.`;
  return [short, long].map((body, index) => {
    const props = stampItemIds(articleMeta, articleProps.parse({ title: "Reading", body, detail: "brief" }));
    return (
      <PartScope key={index} screen="fixture" component={`article_${index}`} state={state} rev={1}>
        <Article {...(props as Parameters<typeof Article>[0])} />
      </PartScope>
    );
  });
}

function Columns({ state }: { state: StateName }) {
  return (
    <PartScope screen="fixture" component="columns" state={state} rev={1}>
      <KitCard padded>
        <KitColumns
          part="lanes"
          loading={state === "loading"}
          columns={["First", "Second", "Third"].map((label, index) => ({
            id: label,
            part: `lane_${index}`,
            label,
            count: "1",
            children: <KitText part={`description_${index}`}>{label} column</KitText>,
          }))}
        />
      </KitCard>
    </PartScope>
  );
}

function Controls({ state }: { state: StateName }) {
  return (
    <PartScope screen="fixture" component="controls" state={state} rev={1}>
      <KitCard padded>
        <KitTrack look="segments" part="track">
          <KitChip item="r1" look="segment" role="tab" label="US" on />
          <KitChip item="r2" look="segment" role="tab" label="A longer alternative" on={false} />
        </KitTrack>
        <KitStepper part="quantity" value={2} min={1} max={3} />
      </KitCard>
    </PartScope>
  );
}

function Week({ state }: { state: StateName }) {
  const days = columns.slice(0, 7);
  const rows = [
    {
      ...matrix.rows[0]!,
      cells: matrix.rows[0]!.cells.slice(0, 7).map((cell, index) =>
        index === 1
          ? {
              ...cell,
              content: (
                <KitText part="shift" lines={1}>
                  07:00–12:00 · Morning shift
                </KitText>
              ),
            }
          : cell,
      ),
    },
  ];
  return (
    <PartScope screen="fixture" component="week" state={state} rev={1}>
      <KitCard padded>
        <KitWeekMatrix part="table" corner={null} days={days} rows={rows} loading={state === "loading"} />
      </KitCard>
    </PartScope>
  );
}

function Drawings({ state }: { state: StateName }) {
  const loading = state === "loading";
  const seats = [
    { id: "r1", label: "A", kind: "free" },
    { id: "r2", label: "B", kind: "free" },
  ] as const;
  const sections = [
    {
      id: "section",
      label: "Seats",
      rows: [
        { label: "01", mark: { icon: "flag" as const, label: "Exit" }, seats },
        { label: "02", seats },
      ],
    },
  ];
  return (
    <PartScope screen="fixture" component="drawings" state={state} rev={1}>
      <KitCard padded>
        <KitSeatGrid part="seat_grid" {...{ sections, loading }} />
        <KitRouteStop item="r3" goto="milestone" label="Milestone" position="start">
          <KitText part={null}>Long milestone description</KitText>
          <KitText part={null}>Fri</KitText>
        </KitRouteStop>
        <div data-testid="legacy-carousel">
          <KitStrip pages>
            <KitText part="first_page">First caption</KitText>
            <KitText part="second_page">Second caption</KitText>
          </KitStrip>
        </div>
      </KitCard>
    </PartScope>
  );
}

function EdgeTable({ state }: { state: StateName }) {
  const columns = [
    {
      id: "value",
      label: "Value",
      header: <KitText part="column">Value</KitText>,
    },
  ];
  const rows = [
    { id: "r1", value: "9", label: "Detail" },
    { id: "r2", value: "109", label: "Sum", total: true },
    { id: "r3", value: null, label: "Adjustment" },
  ].map(({ id, value, label, total }) => ({
    id,
    label,
    total: Boolean(total),
    heading: <KitText part="name">{label}</KitText>,
    target: { item: id, part: "root" },
    cells: [
      {
        id,
        content:
          value === null ? (
            <KitInput part="adjustment" hint="" caption="Adjustment amount" />
          ) : (
            <KitText part="value" role="number" numberScale="compact">
              {value}
            </KitText>
          ),
        target: { item: id, part: "cell" },
      },
    ],
  }));
  return (
    <PartScope screen="fixture" component="edge" state={state} rev={1}>
      <KitCard look="outlined">
        <KitTable
          columns={columns}
          rows={rows}
          corner={null}
          loading={state === "loading"}
          part="table"
          fitColumns
          edge="frame"
        />
      </KitCard>
    </PartScope>
  );
}

function BaseControls({ state }: { state: StateName }) {
  return (
    <PartScope screen="fixture" component="base" state={state} thing="entry" rev={1}>
      <KitCard padded>
        <KitInput kind="search" inset="avatar" part="search" hint="Find" caption="Search caption" />
        <KitRow
          inset="none"
          leadingWidth="avatar"
          leading={<KitPhoto shape="round" initials="S" part={null} />}
          label="Sample"
        >
          <KitText part="name">Sample</KitText>
        </KitRow>
        <KitInput kind="number" part="amount" action="set" value="12" hint="Amount" />
        <div data-testid="control-skeleton">
          <KitSkeleton shape="control" kind="secondary" full />
        </div>
        <KitAction part="delete" icon="trash" a11y="Delete entry" kind="danger" />
        <KitAction part="close" icon="close" a11y="Close editor" kind="quiet" tone="neutral" />
        <KitAction part="keep" label="Keep entry" kind="secondary" />
        <KitCard part="swatch" swatch="navy" children={null} />
        <KitEmpty part="message" noun="record" decorativeIcon />
        <KitEmpty part="explicit" noun="record" title="No saved entries" decorativeIcon />
        <KitEmpty part="cast" decorativeIcon />
        <KitText part="prose">This prose keeps its words and punctuation in place.</KitText>
      </KitCard>
    </PartScope>
  );
}

function Actions() {
  const kinds = ["primary", "quiet"] as const;
  return (
    <PartScope screen="fixture" component="actions" state="filled" rev={1}>
      <KitCard part="frame" padded>
        <Button {...buttonProps.parse({ label: "View available classes", goto: "classes" })} />
        {kinds.flatMap((kind) =>
          [true, false].flatMap((full) =>
            [true, false].map((withIcon) => {
              const part = `${kind}_${full ? "full" : "inline"}_${withIcon ? "icon" : "text"}`;
              return (
                <KitAction
                  key={part}
                  {...{ part, kind, full }}
                  label="Continue"
                  icon={withIcon ? "calendar" : undefined}
                />
              );
            }),
          ),
        )}
        <KitAction part="start" label="Sign in" kind="secondary" full align="start" />
      </KitCard>
    </PartScope>
  );
}

function Hours({ density }: { density: "comfortable" | "compact" }) {
  return (
    <PartScope screen="fixture" component={density} state="filled" rev={1}>
      <KitCard padded>
        <KitHours
          density={density}
          blocks={[
            { id: "r1", start: "09:00", end: "10:00", title: "Planning", goto: "plan" },
            { id: "r2", start: "10:00", end: "11:00", title: "Writing" },
          ]}
        />
      </KitCard>
    </PartScope>
  );
}

function Fixture() {
  const [state, setState] = useState<StateName>("filled");
  const [fit, setFit] = useState(true);
  const [pressed, setPressed] = useState("");
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} interactive onLink={(goto, address) => setPressed(`${goto}:${address}`)}>
        {(["filled", "empty", "loading", "error", "success"] as const).map((value) => (
          <button key={value} onClick={() => setState(value)}>
            {value}
          </button>
        ))}
        <button onClick={() => setFit(!fit)}>Toggle fit</button>
        <Recipes state={state} />
        <PartScope screen="fixture" component="matrix" state={state} rev={1}>
          <KitCard padded>
            <KitTable part="table" corner={null} {...matrix} fitColumns={fit} loading={state === "loading"} />
          </KitCard>
        </PartScope>
        <Links state={state} />
        <Articles state={state} />
        <output data-testid="pressed">{pressed}</output>
        <Columns state={state} />
        <Controls state={state} />
        <Week state={state} />
        <Drawings state={state} />
        <EdgeTable state={state} />
        <BaseControls state={state} />
        <Hours density="comfortable" />
        <Hours density="compact" />
        <Actions />
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
