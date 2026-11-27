<!-- replay-literals: d d mcdd -->

## Purpose

Track saved shop products, compare prices, and move items to the basket.

## Pick

A shop wishlist for saved buy-later products with saved versus current prices, drop alerts, a move-to-cart action, or shared gift claims. Not already in the basket (Cart), ordinary saved links (List), owned stock (Things), or an event registry (Registry).

## Writer

- Use a distinct short product id per item, including items without a link. Use numeric prices without a currency sign. Only write stock when known and never write computed badges.
- Set shared true only for a shared gift list. For two columns set arrange "grid"; otherwise leave arrange null unless requested.
- For a generated image, use `product` or `dish` or `item` in `photo`. Use only to help identify saved items. Keep any supplied reference. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
