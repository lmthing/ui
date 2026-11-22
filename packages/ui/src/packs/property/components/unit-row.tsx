import type { Props } from "../../../catalog";
import { KitGrid, KitLayoutText, KitPhoto, KitRow, KitSkeleton, KitTrail, useWords } from "../../../kit";
import type { unitSnapshot } from "../copy";
import { propertyWordsFor } from "../lang";
import type { meta, props } from "./Units";

type UnitsProps = Props<typeof props, typeof meta>;
type Unit = UnitsProps["units"][number];
const statusTone = { occupied: "good", reserved: "warn", vacant: "muted" } as const;
// prettier-ignore
export function UnitRow({ unit, snapshot, media, density, loading, notice }: {
  unit: Unit;
  snapshot: ReturnType<typeof unitSnapshot>;
  media: UnitsProps["media"];
  density: NonNullable<UnitsProps["density"]>;
  loading: boolean;
  notice: boolean;
}) {
  const { words } = useWords(propertyWordsFor);
  const { status, occupant, rent } = snapshot;
  const photo = media === "thumb" && unit.photo;
  const lines = [
    { part: "title", text: unit.title, role: "body", tone: unit.goto ? "accent" : "text" },
    { part: "address", text: unit.address, role: "caption", tone: "muted" },
    { part: "occupant", text: occupant, role: "body", tone: "text" },
    { part: "rent", text: rent, role: "figure", tone: "text" },
  ] as const;
  return (
    <KitRow item={unit.id} label={loading ? "" : unit.title} goto={loading ? undefined : unit.goto} density={density}
      part={loading ? null : "root"} inset="none" leadingAlign="row" lineRole="heading"
      leading={photo ? loading ? <KitSkeleton shape="figure" inset="none" lead="box" density={density} />
        : <KitPhoto photo={photo} label={unit.title} part="photo" /> : undefined}
      trailing={<KitTrail kind="badge" part="occupancy" value={notice ? words.units.notice : words.units.statusBadge[status]} tone={notice ? "warn" : statusTone[status]} density={density} />}
    >
      <KitGrid arrange="rows" {...{ density }}>
        {lines.map(({ part, text, role, tone }) => <KitLayoutText key={part} density={density}
          line={{ part, text, role, tone, strong: part === "title", compact: true, tabular: role === "figure" }} />)}
      </KitGrid>
    </KitRow>
  );
}
