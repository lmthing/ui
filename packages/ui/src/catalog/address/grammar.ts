export type Address = {
  screen: string;
  component?: string;
  item?: string;
  part?: string;
  after?: string;
};
export const slugPattern = /^[a-z][a-z0-9_]*$/;
export const itemPattern = /^r[1-9][0-9]*$/;
