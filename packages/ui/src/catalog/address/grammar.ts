export type Address = {
  screen: string;
  component?: string;
  item?: string;
  part?: string;
  after?: string;
};
export const slugPattern = /^[a-z][a-z0-9_]*$/;
export const itemPattern = /^r(?:[1-9][0-9]*|_[a-z][a-z0-9]*_[a-z0-9]+(?:_[a-z0-9]+)*)$/;
export const collectionPrefixPattern = /^[a-z][a-z0-9]*$/;
export const collectionItem = (prefix: string, value: string | number) => `r_${prefix}_${value}`;
export const isCollectionItem = (item: string | undefined) =>
  !!item?.startsWith("r_") && itemPattern.test(item);
