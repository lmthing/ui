import { words as ThingsWords } from "./en/Things";
import { words as StorageWords } from "./en/Storage";
import { words as LoansWords } from "./en/Loans";
import { words as WarrantiesWords } from "./en/Warranties";
import { words as WishlistWords } from "./en/Wishlist";
import { words as ListingWords } from "./en/Listing";
import { words as RequestWords } from "./en/Request";
import { words as LeaseWords } from "./en/Lease";
export const en = {
  ...ThingsWords,
  ...StorageWords,
  ...LoansWords,
  ...WarrantiesWords,
  ...WishlistWords,
  ...ListingWords,
  ...RequestWords,
  ...LeaseWords,
};

export type InventoryWords = typeof en;
