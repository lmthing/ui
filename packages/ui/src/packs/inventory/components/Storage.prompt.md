## Purpose

Find things stored inside rooms, shelves and boxes.

## Pick

Browse nested physical storage with a breadcrumb, child locations and contents kept here. Not flat linked names (List), geographic pins (MapPins), or stock records (Things).

## Writer

- Path is ancestor labels in outer-to-inner order. Ancestor screen ids must match their labels in lowercase snake_case (Potting bench → potting_bench). Prefix numeric or reserved ids with "spot_".
- Spots are child locations; here lists what is kept in the current location. Never write counts. To hide counts use detail "brief", density null and surface null. For the default view leave all three axes null.
