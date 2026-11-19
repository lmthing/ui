// Writes the first screen (header, hero words, the hero's first frame) into index.html as plain markup, so the
// largest paint does not wait for any script. React then replaces it with the live page, which starts identical.
import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroCopy } from "../src/landing/HeroCopy";
import { HeroFrame } from "../src/landing/HeroFrame";
import { Header } from "../src/shell/Header";

const themeButton = (
  <div className="theme-pop">
    <button type="button" aria-expanded="false">
      <i className="swatch" aria-hidden="true" />
      Theme: calm, moss, light
    </button>
  </div>
);

export function prerender(out: string): void {
  const html = renderToStaticMarkup(
    <>
      <Header themeSlot={themeButton} />
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-h">
          <HeroCopy />
          <HeroFrame />
        </section>
      </main>
    </>,
  );
  const file = `${out}/index.html`;
  const page = readFileSync(file, "utf8");
  writeFileSync(file, page.replace('<div id="root"></div>', `<div id="root">${html}</div>`));
}
