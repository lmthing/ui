import { lazy } from "react";
import { Lazy } from "../shared/Lazy";
import { site } from "../data/site";

const CreateDemo = lazy(() => import("../create/CreateDemo").then((m) => ({ default: m.CreateDemo })));

export function Hero() {
  const { stats } = site;
  return (
    <header className="hero wrap">
      <div className="hero-copy">
        <p className="eyebrow">lmthing/ui</p>
        <h1>Models pick. The kit renders.</h1>
        <p className="lede">
          A fixed, typed catalog of {stats.core} core components that a model chooses from and fills in as
          JSON lines, and a kit that draws them. The model never writes code, a colour or a size, so even a
          small model cannot produce a broken screen.
        </p>
        <div className="cta">
          <a className="btn primary" href="#try">
            Try it with a model
          </a>
          <a className="btn" href="#components">
            Browse {stats.built} components
          </a>
          <a className="btn" href="gallery/">
            Static gallery
          </a>
        </div>
        <p className="hero-note">
          Live below: a real kit screen assembling from real recorded output. {stats.shipped} components are
          ready, {stats.packsReady} of {site.packs.length} packs are live, the rest are planned.
        </p>
      </div>
      <div className="hero-demo">
        <Lazy view={CreateDemo} compact />
      </div>
    </header>
  );
}
