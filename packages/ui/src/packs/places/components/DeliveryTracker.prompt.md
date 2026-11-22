## Purpose

Follow a delivery on its way and contact the courier.

## Pick

Live courier and destination together on a map with delivery ETA and current step. Not order steps without a map (OrderStatus) or a path through planned stops (Route).

## Writer

- Write the current step only. Never write an ETA or map positions; the delivery service supplies them.
- Hiding the courier photo only changes media: use "media":"none","density":null. Keep the photo reference. Leave density and surface null unless specifically requested.
