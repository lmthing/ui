import { words as ApplicantPipelineWords } from "./en/ApplicantPipeline";
import { words as packWords } from "./en/pack";
import { words as ApplicationsWords } from "./en/Applications";
import { words as CandidateWords } from "./en/Candidate";
import { words as InterviewWords } from "./en/Interview";
export const en = {
  ...ApplicantPipelineWords,
  ...packWords,
  ...ApplicationsWords,
  ...CandidateWords,
  ...InterviewWords,
};

export type HiringWords = typeof en;
