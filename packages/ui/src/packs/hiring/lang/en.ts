import { words as ResumeProfileWords } from "./en/ResumeProfile";
import { words as JobFeedWords } from "./en/JobFeed";
import { words as JobPostWords } from "./en/JobPost";
import { words as OfferWords } from "./en/Offer";
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
  ...ResumeProfileWords,
  ...JobFeedWords,
  ...JobPostWords,
  ...OfferWords,
};

export type HiringWords = typeof en;
