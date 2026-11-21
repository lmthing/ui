import { useMemo } from "react";
import { packById, site } from "../data/site";
import { Phone } from "../live/Phone";
import { cleanScreen, screenOfLines } from "../live/screen";

/** The pack's worked example app, drawn live in each built preset. */
export default function WorkedExample({ id }: { id: string }) {
  const pack = packById.get(id)!;
  const screen = useMemo(() => cleanScreen(screenOfLines(`${id}_app`, pack.lines)), [id, pack]);
  return (
    <section className="worked-example" aria-label="Worked example in every preset">
      <h2>The worked app</h2>
      <div className="showcase">
        {site.presets.map((p) => (
          <Phone
            key={p.id}
            screen={screen}
            deviceData={pack.deviceData}
            width={320}
            height={600}
            fixed
            theme={{ preset: p.id }}
            label={`${p.id} preset`}
          />
        ))}
      </div>
    </section>
  );
}
