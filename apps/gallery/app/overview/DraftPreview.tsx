import { KitCard, KitText } from "@lmthing/ui/kit";
import { draftLabel } from "./gallery-data";

export function DraftPreview({ id }: { id: string }) {
  return (
    <KitCard style="inset" padded part="root">
      <KitText role="body" tone="muted" part={null}>
        {draftLabel(id)}
      </KitText>
    </KitCard>
  );
}
