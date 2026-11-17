export type CastLike = {
  things: { type: string; fields: string[] }[];
  items: { id: string; type: string; sample: boolean; [field: string]: unknown }[];
};
