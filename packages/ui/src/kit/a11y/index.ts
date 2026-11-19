import { createContext } from "react";

/** The visible row label, inherited by its independent controls unless they supply their own. */
export const RowLabelContext = createContext<string | undefined>(undefined);
