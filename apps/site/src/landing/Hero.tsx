import { lazyChunk } from "../shared/lazyChunk";
import { Lazy } from "../shared/Lazy";
import { useAfterLoad } from "../shared/useAfterLoad";
import { HeroCopy } from "./HeroCopy";
import { HeroFrame } from "./HeroFrame";

const CreateDemo = lazyChunk(() => import("../create/CreateDemo"));

export function Hero() {
  const ready = useAfterLoad();
  return (
    <section className="hero wrap" aria-labelledby="hero-h">
      <HeroCopy />
      {ready ? <Lazy view={CreateDemo} fallback={<HeroFrame />} /> : <HeroFrame />}
    </section>
  );
}
