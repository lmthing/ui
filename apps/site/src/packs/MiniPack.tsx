import { useMemo } from "react";
import { packById } from "../data/site";
import { Phone } from "../live/Phone";
import { cleanScreen, screenOfLines } from "../live/screen";

/** The pack's worked app as a phone at half size, so the shelf shows a real screen and not a crop. */
export default function MiniPack({ id }: { id: string }) {
  const pack = packById.get(id);
  const screen = useMemo(() => cleanScreen(screenOfLines(`${id}_mini`, pack?.lines ?? [])), [id, pack]);
  return (
    <span className="mini-pack" inert>
      <span className="mini-scale">
        <Phone screen={screen} width={300} height={560} fixed />
      </span>
    </span>
  );
}
