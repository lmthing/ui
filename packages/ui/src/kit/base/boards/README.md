# boards

`KitSeatGrid` draws supplied seating sections, including aisles and an optional screen marker.
`KitCellGrid` draws caller-evaluated puzzle cells at zero-based coordinates.

Both preserve control widths when scrolling and retain their geometry when loading.
Each grid uses one web tab stop, with arrow keys and Home/End to move within it.
Native users browse individual cells and can activate addressed cells by accessibility tap.
Targets go through the shared kit controller; the bases do not book seats or solve puzzles.
