import { createContext } from "react";

/** Scripted overlays have no local dismiss affordance. Static component previews are unaffected. */
export const SheetPreviewContext = createContext(false);
