type RoundFields = Readonly<Record<string, unknown>>;
type Assessment = {
  inputs: Readonly<Record<string, "select" | "type">>;
  readHidden?: readonly string[];
  revise?: (answers: RoundFields, part: string, value: unknown) => RoundFields;
  /** Undefined means the response is not ready to check. */
  grade: (item: RoundFields, answers: RoundFields) => boolean | undefined;
  project: (item: RoundFields, answers: RoundFields) => RoundFields;
};
type RoundKind =
  | { next: string; assessment?: Assessment; ratings?: never }
  | { next?: never; assessment?: never; ratings: readonly string[]; front: readonly string[] };
export type Session =
  | {
      kind: "turns";
      items: string;
      first?: string;
      direction?: string;
      laps?: string;
      next: string;
      back?: string;
      skip?: string;
      reverse?: string;
      restart?: string;
    }
  | ({
      kind: "rounds";
      items: string;
      hidden: readonly string[];
      reveal: string;
      restart?: string;
    } & RoundKind);
