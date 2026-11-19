import { useState } from "react";
import { itemById } from "../data/site";
import { Phone } from "../live/Phone";
import { Json } from "../shared/Json";
import { Controls } from "./Controls";
import { NotFound } from "../shell/NotFound";
import { PageHead } from "./PageHead";
import { usePlayground } from "./usePlayground";

/** Controls from the component's Zod schema, a live phone, its JSON line, addresses and agent read text. */
export default function ComponentPage({ id }: { id: string }) {
  const pg = usePlayground(id);
  const [width, setWidth] = useState(390);
  const [hover, setHover] = useState<string | null>(null);
  const item = itemById.get(id);
  if (!pg.def || !item) return <NotFound what={`component called ${id}`} />;
  return (
    <main id="main" className="wrap page playground">
      <PageHead id={id} item={item} />
      <div className="pg-grid">
        <Controls id={id} pg={pg} width={width} setWidth={setWidth} />
        <div className="pg-stage">
          <Phone screen={pg.screen} width={width} height={620} onHover={setHover} />
          <p className="addr-tip" aria-live="polite">
            {hover ? `address: ${hover}` : "hover a part to see its address"}
          </p>
        </div>
      </div>
      <h3>The JSON line a model writes</h3>
      <pre className="code">
        <Json text={pg.line} />
      </pre>
      <h3>What an agent reads</h3>
      <pre className="code">{pg.text}</pre>
      <p className="muted">
        Parts: {(pg.def.meta.parts ?? []).join(", ") || "root"}. Addresses look like <code>play/c1/root</code>
        .
      </p>
    </main>
  );
}
