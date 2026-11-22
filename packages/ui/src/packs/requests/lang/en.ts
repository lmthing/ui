import { words as RequestQueueWords } from "./en/RequestQueue";
import { words as RequestThreadWords } from "./en/RequestThread";
import { words as WorkOrderWords } from "./en/WorkOrder";
import { words as RequestTriageWords } from "./en/RequestTriage";
import { words as RequestResolutionWords } from "./en/RequestResolution";

export const en = {
  ...RequestQueueWords,
  ...RequestThreadWords,
  ...WorkOrderWords,
  ...RequestTriageWords,
  ...RequestResolutionWords,
};

export type RequestsWords = typeof en;
