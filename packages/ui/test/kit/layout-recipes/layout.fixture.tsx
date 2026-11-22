import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { themeName, type StateName } from "@lmthing/ui/catalog";
import {
  KitAction,
  KitActionFooter,
  KitCard,
  KitFigure,
  KitGrid,
  KitHeader,
  KitLayoutText,
  KitMetaLine,
  KitPhoto,
  KitProvider,
  KitRow,
  KitRowGroup,
  KitState,
  KitTable,
  KitText,
  KitTrail,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../../render";

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

function Fixture() {
  const [state, setState] = useState<StateName>("filled");
  const [fit, setFit] = useState(true);
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
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
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
