import { lazy } from "react";
import { Lazy } from "../shared/Lazy";
import { site } from "../data/site";

const CreateDemo = lazy(() => import("../create/CreateDemo"));

export function Hero() {
  const { stats } = site;
  return (
    <section className="hero wrap" aria-labelledby="hero-h">
      <div className="hero-copy">
        <p className="label">01 / Watch</p>
        <h1 id="hero-h">Components a model can't misuse</h1>
        <p className="lede">
          lmthing/ui is the component catalog behind lmthing. A model picks from {stats.core} core components
          and up to three of {site.packs.length} domain packs, and writes each one as a JSON line. Code checks
          the line and the kit draws it. There is no code, colour or size in a line to get wrong.
        </p>
        <p className="actions">
          <a className="btn primary" href="#try">
            Try it with a model
          </a>
          <a className="textlink" href="#/components">
            Browse {stats.built} components
          </a>
        </p>
        <p className="facts">
          {stats.shipped} components ready · {stats.packsReady} of {site.packs.length} packs live ·{" "}
          {stats.themesBuilt} themes built
        </p>
      </div>
      <Lazy view={CreateDemo} fallback={<div className="demo-skel" aria-busy="true" />} />
    </section>
  );
}
