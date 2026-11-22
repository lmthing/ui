## Purpose

Browse nearby places on a map and in a linked list.

## Pick

Browse six or more places with matching detailed rows and pins, or switch between a linked map and list-only view. Not a small map of up to five pins (MapPins) or rows without any map (List).

## Writer

- Keep up to six places with one short note each and a goto link. Never write distances, pin positions, a total count, or view selection.
- A request for a three-way selector with both panes initially visible REQUIRES "style":"split". Null gives only two choices (With map and Just the list), not a three-way selector.
- Start with just pins using "style":"map" or just rows using "style":"list". Never use "map" when rows must be shown. For the usual two-choice map-and-rows layout, leave style null.
- To hide notes, set detail to brief and still write each note in meta.
