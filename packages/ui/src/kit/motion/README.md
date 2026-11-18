# kit/motion

Shared RAF spring interpolation uses the catalog springs on web and native. A native host may drive
its stage worklets with the exported spring configs. Arrival uses opacity and an eight-point rise,
with forty-millisecond stagger capped at six. Removal fades/collapses; changed height springs in place.
Button press feedback and ten signature hooks use the same tokens.

Agent mode uses the end state. Reduced motion cross-fades ordinary transitions and shows signature
end states. No idle animation loops. Native rendering/performance still needs device acceptance.
