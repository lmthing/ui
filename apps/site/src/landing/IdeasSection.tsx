import { itemById, site } from "../data/site";
import { Json } from "../shared/Json";
import { Reveal } from "../shared/Reveal";

type Idea = { title: string; body: string; code: string; status?: string };

function lineFor(id: string) {
  return itemById.get(id)?.line.replace('"id":"x1"', '"id":"b1"') ?? "";
}

function ideas(): Idea[] {
  const t = site.presets[0]!.id;
  const a = site.accents[0]!.id;
  return [
    {
      title: "A fixed, typed catalog",
      body: `${site.stats.core} core components plus domain packs. Each one is a single file holding its Zod schema, examples and view, so the prompt, the validator and the renderer cannot drift.`,
      code: lineFor("Button"),
    },
    {
      title: "Strict structured output",
      body: "writerFormat(registry) builds a JSON schema with one branch per component. A line can only name a component the app has, and only props it declares.",
      code: '{ "type": "json_schema", "json_schema": { "strict": true,\n  "schema": { "anyOf": [ { "c": { "const": "Button" }, ... }, ... ] } } }',
    },
    {
      title: "No free values",
      body: "Nothing in the catalog carries a colour, pixel, font or motion value. Looks come from tokens and presets the app owns.",
      code: '// no "color": "#...", no "width": 320\n{ "kind": "primary" }   // an enum, not a style',
    },
    {
      title: "Themes are enums",
      body: `A theme is preset, accent and mode, plus density and motion (planned, step U6a). ${site.stats.presetsBuilt} presets and ${site.stats.accentsBuilt} accents are built; 12 of each are planned (288 themes).`,
      code: `{ "preset": "${t}", "accent": "${a}", "mode": "dark" }\n// -> kit_${t}_dark_${a}`,
    },
    {
      title: "Stable part addresses",
      body: "Every touchable part has an address, screen/component[/item][/part]. Agents read a screen as text and act by address, through the same code a finger uses.",
      code: "home/l1/r1/trail  toggle\nhome/b1/root      press",
    },
    {
      title: "Shared variant axes",
      body: "One closed vocabulary (density, emphasis, surface, arrange, ...) shared by every component, mapped to tokens by the theme.",
      code: '{ "density": "compact", "surface": "card" }',
      status: "planned: step U6a",
    },
  ];
}

export function IdeasSection() {
  return (
    <section className="block wrap" id="ideas">
      <p className="eyebrow">Key ideas</p>
      <h2>Built so a model can only get it right</h2>
      <div className="ideas">
        {ideas().map((idea, i) => (
          <Reveal key={idea.title} delay={(i % 3) * 80} className="idea card">
            <h3>
              {idea.title}
              {idea.status && <span className="chip warn">{idea.status}</span>}
            </h3>
            <p>{idea.body}</p>
            <pre className="code">
              <Json text={idea.code} />
            </pre>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
