import { useMemo, useState } from "react";
import type { DeviceData, ScreenLike } from "@lmthing/ui/catalog";
import { packById, site } from "../data/site";
import { Phone } from "../live/Phone";
import { cleanScreen, screenOfLines } from "../live/screen";
import { linkedRecords } from "./linked-records";

function WorkedPhone({
  screen,
  preset,
  snapshot,
}: {
  screen: ScreenLike;
  preset: string;
  snapshot: DeviceData | undefined;
}) {
  const [linked, setLinked] = useState(() => linkedRecords(screen));
  const deviceData = useMemo(() => (linked ? { ...snapshot, ...linked } : snapshot), [snapshot, linked]);
  return (
    <Phone
      screen={screen}
      deviceData={deviceData}
      onChange={linked ? (current, values) => setLinked(linkedRecords(current, values)) : undefined}
      width={320}
      height={600}
      fixed
      theme={{ preset }}
      label={`${preset} preset`}
    />
  );
}

/** The pack's worked example app, drawn live in each built preset. */
export default function WorkedExample({ id }: { id: string }) {
  const pack = packById.get(id)!;
  const screen = useMemo(() => cleanScreen(screenOfLines(`${id}_app`, pack.lines)), [id, pack]);
  return (
    <section className="worked-example" aria-label="Worked example in every preset">
      <h2>The worked app</h2>
      <div className="showcase">
        {site.presets.map((p) => (
          <WorkedPhone key={`${id}/${p.id}`} screen={screen} preset={p.id} snapshot={pack.deviceData} />
        ))}
      </div>
    </section>
  );
}
