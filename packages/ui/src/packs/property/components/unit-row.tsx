import type { Props } from "../../../catalog";
import {
  KitContent,
  KitGrid,
  KitLayoutText,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitTrail,
  useWords,
} from "../../../kit";
import type { unitSnapshot } from "../copy";
import { propertyWordsFor } from "../lang";
import type { meta, props } from "./Units";

type UnitsProps = Props<typeof props, typeof meta>;
type Unit = UnitsProps["units"][number];
const statusTone = { occupied: "good", reserved: "warn", vacant: "muted" } as const;
// prettier-ignore
export function UnitRow({ unit, snapshot, media, density, loading, notice, inline }: {
  unit: Unit;
  snapshot: ReturnType<typeof unitSnapshot>;
  media: UnitsProps["media"];
  density: NonNullable<UnitsProps["density"]>;
  loading: boolean;
  notice: boolean;
  inline: boolean;
}) {
  const { words } = useWords(propertyWordsFor);
  const { status, occupant, rent } = snapshot;
  const photo = media === "thumb" && unit.photo;
  const lines = [
    { part: "title", text: unit.title, role: "body", tone: unit.goto ? "accent" : "text" },
    { part: "address", text: unit.address, role: "caption", tone: "muted" },
    { part: "occupant", text: occupant, role: "caption", tone: "muted" },
  ] as const;
  return (
    <KitRow item={unit.id} label={loading ? "" : unit.title} goto={loading ? undefined : unit.goto} density={density}
      part={loading ? null : "root"} inset="none" leadingAlign="row" {...{ inline }}
      leading={photo ? loading ? <KitSkeleton shape="figure" inset="none" lead="box" density={density} />
        : <KitPhoto photo={photo} label={unit.title} part="photo" /> : undefined}>
      <KitGrid fitLast {...{ density }}>
        <KitContent rhythm="flush" {...{ density }}>
          {lines.map(({ part, text, role, tone }) => <KitLayoutText key={part} density={density}
            line={{ part, text, role, tone, strong: part === "title" }} />)}
        </KitContent>
        <KitContent rhythm="flush" {...{ density }}>
          <KitRow part={null} label={unit.title} inline fitContent {...{ density }} trailing={
            <KitTrail kind="badge" part="occupancy" value={notice ? words.units.notice : words.units.status[status]} tone={notice ? "warn" : statusTone[status]} {...{ density }} />
          }>{null}</KitRow>
          <KitLayoutText line={{ part: "rent", text: rent, role: "figure", compact: true, tabular: true }} align="end" {...{ density }} />
        </KitContent>
      </KitGrid>
    </KitRow>
  );
}
