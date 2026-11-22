## Purpose

Read and control connected household devices and apply saved settings together.

## Pick

Only for explicitly connected household hardware: switches, thermostat set points and readings, sensor ranges and multi-device scenes. Local app preferences with a switch at the end of each row are List, never this component. Not a single form value (Field), navigation (Actions), manual summary numbers (Stats), recent manual history (Sparkline), or a person's body readings (Vitals).

## Writer

- Use unique keys across all rooms. Light/heat/plug/lock/fan require on; lock on:true means locked. Heat requires temp 5–30 °C and may have reading; heat MUST have level:null, unit:null, normal:null. Celsius is implicit for heat: never write unit:celsius on a thermostat.
- Sensors require reading and unit (celsius, percent, ppm, lux), optionally normal:{low,high} with low<=high. Sensors MUST have on:null, level:null, temp:null. Light/fan/blind may have level 0–100; blinds MUST have on:null. All non-heat devices MUST have temp:null. Only sensors have unit/normal, only heat/sensor have reading; use null for unsupported optional fields.
- Only heat devices may have mode (heat, cool, auto, off) or coolTemp (cooling set point, 5–30 °C). Keep writing temp for the heating set point. When not given, leave mode and coolTemp null. These two fields are not scene settings.
- Scenes default to []. Each has 2–6 distinct device targets, with key and at least one supported absolute on/level/temp setting. Never target sensors or unknown keys. focus must name a device.
- Never write active-scene, out-of-range, pending or command-outcome flags. Code chooses apply versus secure from lock targets. Lock changes and lock scenes always confirm.
- Put devices in their rooms even if the person asks for a single ungrouped list; use group "none" for that presentation only. Use style "focused" only when asked to enlarge a specific device. Write surface:null unless asked for outlined tiles.
- Valid heat: {"key":"heat","name":"Thermostat","kind":"heat","on":true,"level":null,"temp":21,"reading":20.5,"unit":null,"normal":null,"goto":null}. Valid blind scene target: {"key":"blind","on":null,"level":0,"temp":null}. Scene targets obey the referenced device kind, not the other devices in the scene.
