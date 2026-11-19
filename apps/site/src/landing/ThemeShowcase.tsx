import { itemById, site } from "../data/site";
import { Phone } from "../live/Phone";
import { cleanScreen, screenOfLines } from "../live/screen";

const picks = ["Header", "Stats", "List", "Actions"];

/** The same screen drawn in each built preset at once; the page's accent and mode apply. */
export default function ThemeShowcase() {
  const lines = picks.flatMap((id, i) => {
    const line = itemById.get(id)?.line;
    return line ? [line.replace('"id":"x1"', `"id":"s${i}"`)] : [];
  });
  const screen = cleanScreen(screenOfLines("showcase", lines));
  return (
    <div className="showcase">
      {site.presets.map((preset) => (
        <Phone
          key={preset.id}
          screen={screen}
          width={300}
          height={520}
          theme={{ preset: preset.id }}
          label={`${preset.id}: ${preset.mood}, ${preset.shape} shapes`}
        />
      ))}
    </div>
  );
}
