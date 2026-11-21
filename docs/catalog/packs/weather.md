# `weather` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Live conditions, hourly curves, multi-day temp range bars,
AQI/UV/wind gauges, severe alerts, sun/moon arcs, saved cities and radar snapshots. Not trip planning
(`trips`), not local venues (`places`).

## Purpose

Standalone weather forecasting, severe storm alerting, air-quality and UV/pollen tracking, astronomical
daylight/lunar arcs, and stepped radar previews. **Explicitly, standalone weather apps use `weather`'s 8
components (`WeatherHero`, `HourlyForecast`, `DailyForecast`, `RadarMap`, `AirQuality`, `SevereAlert`,
`UvPollen`, `AstroSun`), superseding the lightweight `trips/Weather` widget whenever a full weather
experience is picked.** Keeping `weather` separate from `trips` ensures dedicated weather apps never load
passports or packing lists, while trip apps needing deeper forecasts can combine `trips, weather`.

## Apps it serves

Full-featured consumer weather apps (The Weather Channel, AccuWeather, Google Weather, 1Weather, Weather
Underground), radar & storm alert trackers (MyRadar, Weather & Radar, WeatherBug, RadarScope), and air
quality / UV / allergy / astronomy companions.

## What the core already covers

- Generic numeric summary tiles: `Stats`; simple non-weather notices: `Banner`; helpful copy: `Note`.
- Saved cities list or quick city search: Core `Search` and `List[cards]` (each row carrying city name,
  local time, condition icon, temperature `value`, and alert `badge`).
- Custom GL 60fps NEXRAD Doppler shaders, particle wind advection, and interactive vector radar tilt/zoom:
  Core `Canvas` / native map SDK.

Standalone weather apps always pick `weather`'s 8 components (`WeatherHero`, `HourlyForecast`,
`DailyForecast`, `RadarMap`, `AirQuality`, `SevereAlert`, `UvPollen`, `AstroSun`), superseding the
lightweight `trips` `Weather` destination widget. `WeatherHero` replaces generic `Hero` for live weather
conditions; `HourlyForecast` replaces `Sparkline` for 24–48h curves and MinuteCast rain; `DailyForecast`
replaces `Calendar` for 7–14 day aligned thermal range bars; `RadarMap` replaces `MapPins` for stepped
weather radar overlays; `SevereAlert` replaces `Banner` for official CAP/NWS hazards; `AirQuality` and
`UvPollen` replace `Stats` for environmental health scales; and `AstroSun` replaces `trips` `Clocks` for
solar arcs and moon phases.

## Components (8)

### `WeatherHero` · planned · content · service
Live current-conditions header displaying active city and region, local observation timestamp, large current
temperature, condition icon and label, feels-like temperature, today's high and low, wind summary, and a
one-line short-term precipitation outlook ("Rain starting in 18 min"). Tapping the city pill opens the
saved-cities switcher; a compact style adapts cleanly for secondary forecast screens.
- Pick: live current weather snapshot for the active city at the top of a standalone weather screen
  (superseding `trips` `Weather` for weather apps). Not generic headlines (`Hero`), not multi-day forecasts
  (`DailyForecast`), not a list of saved cities (`List`).
- Writes: `city` text(28), `region` text(24) optional, `unit` (`c`, `f`, default `c`), `locationGoto`
  optional, `style`. Live temperature, feels-like, condition icon/text, daily high/low, wind, and nowcast
  precipitation ETA come from the weather service, never model-written numbers.
- Styles: `hero` (default, oversized live temperature, condition icon, H/L, feels-like, and precip ETA),
  `compact` (single condensed condition header for multi-day or city-switcher screens).
- Parts → actions: `location press` (opens `locationGoto`), `unit toggle` (°C/°F display unit), `refresh
  press`, `gps press` (`meta.partTiers: { gps: "ok" }`, detect current location).
- States: filled, loading, error (weather feed unavailable), offline (cached observation with stale time).
- Real path: fetches live observations and short-range nowcasts from a weather API, optionally resolving
  user coordinates via device location (`ok`).

### `HourlyForecast` · planned · data · service
Scrollable 24-to-48-hour forecast rendered either as an hourly card strip (hour, condition icon, temperature,
precipitation percentage) or as a continuous temperature and rain-probability curve (`KitLinePlot`), plus a
MinuteCast mode plotting minute-by-minute rain intensity bars for the next 60 minutes. Tapping any hour
inspects its wind speed, dew point, and precipitation rate.
- Pick: hour-by-hour conditions or minute-by-minute precipitation timing over 1–48 hours. Not multi-day
  temperature range bars (`DailyForecast`), not short generic trends (`Sparkline`), not general metrics
  (`data` `LineChart`).
- Writes: `city` text(28), `hours` (12 | 24 | 48, default 24), `selectedHour` int 0–47 optional, `style`.
  Hourly temperatures, precipitation probabilities, rain intensity rates, and curve series come from the
  weather service.
- Styles: `strip` (default, horizontal scrollable hourly strip), `curve` (continuous `KitLinePlot` temp and
  precip graph with selectable cursor), `minutecast` (60-minute rain-intensity bar breakdown).
- Parts → actions: hours `root select` (inspect specific hour), `style select` (switch strip, curve, or
  minutecast).
- States: filled, empty (minute nowcast unsupported in region), loading, error (hourly feed unavailable).
- Real path: consumes hourly numerical weather prediction and hyperlocal precipitation nowcasts from a
  weather data service.

### `DailyForecast` · planned · data · service
Seven- to fourteen-day outlook where each row plots a proportional low-to-high temperature range bar
(`KitRangeBand`) calibrated against the entire visible week's overall minimum and maximum temperatures,
alongside weekday label, condition icon, precipitation probability badge, and an expandable day/night split
with wind and precip totals.
- Pick: multi-day weather outlook (7–14 days) with scaled weekly temperature range bars. Not hourly curves
  (`HourlyForecast`), not month calendars (`Calendar`), not trip weather strips (`trips` `Weather`).
- Writes: `city` text(28), `days` (7 | 10 | 14, default 10), `expandedDay` int 0–13 optional, `style`. All
  daily highs, lows, weekly thermal span bounds, precip chances, and day/night summaries come from the weather
  service.
- Styles: `bars` (default, aligned low-to-high thermal range bars per day), `expanded` (all days showing
  day/night breakdown, UV peak, and wind).
- Parts → actions: rows `root toggle` (expand or collapse day/night split).
- States: filled, loading, error (extended outlook unavailable).
- Real path: pulls 7–14 day forecasts from a weather service and normalizes every row's `KitRangeBand`
  against the week's overall thermal min and max.
- Density: `meta.dense: true`, weight 3; 7–14 multi-day rows with scaled range bars and expandable day/night
  splits exceed six rows.

### `RadarMap` · planned · data · service
Stepped weather radar and atmospheric layer preview over `KitMapTile` featuring a `-1h` to `+2h` timeline
slider, layer selector pills (`radar`, `wind`, `temp`, `clouds`), play/pause stepped frame cycling, and an
incoming precipitation ETA badge. Continuous 60fps GPU Doppler tile shaders remain in `Canvas` / native map
renderers.
- Pick: stepped weather radar, wind, or temperature map snapshots with timeline scrub. Not venue pins
  (`MapPins`, `places` `MapList`), not continuous 60fps Doppler shaders (`Canvas`).
- Writes: `city` text(28), `layer` (`radar`, `wind`, `temp`, `clouds`), `frameIndex` int 0–11, `playing`
  boolean (default false), `style`. Radar tile frames, storm markers, timestamps, and incoming rain ETA
  come from the weather map service.
- Styles: `preview` (default, compact radar card with timeline scrubber and layer pills), `layers` (expanded
  radar frame with color legend scale and playback controls).
- Parts → actions: `layer select`, `frame set` (stepped timeline slider), `play play`, `play pause`, `locate
  press` (`meta.partTiers: { locate: "ok" }`).
- States: filled, loading (fetching radar frames), error (radar feed unavailable), offline (last cached
  frame timestamped).
- Real path: fetches stepped radar/satellite tile images from a weather mapping service, optionally
  centering on device GPS (`ok`).

### `AirQuality` · planned · data · service
Air quality and atmospheric comfort dashboard plotting the Air Quality Index (AQI) on a color-coded health
band (`KitRangeBand`) with plain health guidance, pollutant tiles (`PM2.5`, `PM10`, `O3`, `NO2`), and live
ambient readings for wind speed/gusts with compass bearing, humidity, dew point, barometric pressure trend,
and visibility.
- Pick: inspecting local AQI bands, air pollutants, and atmospheric wind/humidity/pressure/visibility
  conditions. Not UV or pollen forecasts (`UvPollen`), not body vitals (`health` `Vitals`), not generic
  numeric cards (`Stats`).
- Writes: `city` text(28), `scale` (`us_epa`, `eu_eaqi`), `style`. Live AQI value, health category, pollutant
  readings, wind bearing/gusts, humidity, dew point, pressure trend, and visibility come from the
  environmental weather service.
- Styles: `aqi` (default, AQI health band and pollutant concentration grid), `atmosphere` (wind vector,
  humidity/dew point, barometric pressure, and visibility tiles alongside AQI summary).
- Parts → actions: `style select`, `scale select` (US EPA vs EU EAQI).
- States: filled, empty (monitoring station unavailable), loading, error (air-quality service offline).
- Real path: queries real-time air-quality monitoring stations and surface weather observations from an
  environmental weather API.

### `SevereAlert` · planned · content · service
Severity-coded severe weather alert card (`advisory`, `watch`, `warning`, `emergency`) surfacing storm,
tornado, flood, heat, winter, or lightning-proximity hazards with issuing authority (e.g., NWS), active
start-to-end window, affected zones, and expandable protective safety instructions. Non-emergency advisories
can be dismissed locally, while active warnings remain pinned until expiration.
- Pick: urgent weather hazards, storm warnings, and official safety guidance. Not generic app notices
  (`Banner`), not static informational copy (`Note`).
- Writes: `alerts` of `alertRef` text(32), `headline` text(48), `severity` (`advisory`, `watch`, `warning`,
  `emergency`), `issuer` text(28), `startsAt` ISO datetime with offset, `endsAt` ISO datetime with offset,
  `area` text(36), `guidance` text(240), 1–6; `style`. Severity tone mapping, active/expired status, and
  remaining duration are computed by code.
- Styles: `card` (default, full alert details, active window, and expandable protective instructions),
  `compact` (single high-visibility alert strip linking to full warning details).
- Parts → actions: alerts `root toggle` (expand/collapse safety guidance), alerts `dismiss dismiss`
  (`advisory` only), `notify toggle` (`meta.partTiers: { notify: "ok" }`).
- States: filled, empty (no active watches or warnings), loading, error (alert feed unavailable).
- Real path: ingests official CAP/NWS severe weather alert feeds from a weather service; push alerts require
  notification permission (`ok`).

### `UvPollen` · planned · data · service
Solar UV radiation and seasonal allergen index panel plotting current and peak UV index on `KitRangeBand`
(`Low` to `Extreme`) with peak-sun window and protection guidance, paired with tree, grass, ragweed, and
mold pollen index meters and a three-day allergy outlook.
- Pick: tracking UV radiation levels, peak sun hours, and pollen/allergen counts. Not AQI particulates and
  wind/pressure (`AirQuality`), not sunrise/sunset arcs (`AstroSun`).
- Writes: `city` text(28), `style`. Live UV index, peak sun window, SPF/shade tips, and tree/grass/weed/mold
  pollen levels come from the environmental forecast service.
- Styles: `combined` (default, UV scale and peak window above four pollen meters), `pollen` (expanded
  allergen breakdown with 3-day outlook).
- Parts → actions: `style select`, `remind toggle` (`meta.partTiers: { remind: "ok" }`, UV/allergy alert).
- States: filled, empty (pollen reporting out of season), loading, error (environmental feed unavailable).
- Real path: retrieves solar UV and regional pollen forecasts from a weather service; daily peak alerts use
  local notification permission (`ok`).

### `AstroSun` · planned · data · phone
Astronomical horizon arc (`KitRadialTrack`) plotting the sun's current progress between sunrise and sunset,
total daylight span and remaining daylight, golden hour and twilight timestamps, paired with moon phase
label, illumination percentage, and moonrise/moonset times. Solar and lunar ephemeris angles calculate
locally from calendar date and city coordinates.
- Pick: sunrise, sunset, daylight progress arc, golden hour, and moon phase/illumination. Not world time
  zones (`trips` `Clocks`), not general timers (`Timer`).
- Writes: `city` text(28), `date`, `lat` number -90–90, `lon` number -180–180, `zone` text(40), `style`.
  Sunrise, sunset, solar noon, golden hour, daylight duration, arc progress, and lunar phase/illumination
  are computed locally by code from `lat`, `lon`, `date`, and `zone`.
- Styles: `arc` (default, semicircular solar horizon track with twilight markers), `moon` (paired daylight
  summary and lunar phase/illumination panel).
- Parts → actions: `style select` (switch solar arc vs sun/moon panel).
- States: filled (including polar day/night handling), loading.
- Real path: computes astronomical sun/moon ephemeris locally on the device from city coordinates or optional
  device GPS (`ok`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `weather_forecast` | Live conditions, hourly curve, week outlook, and sun arc | `weather_today`, `weather_outlook`, `weather_air_uv` | `weather_today`: Header, WeatherHero, HourlyForecast, AirQuality, AstroSun · `weather_outlook`: Header[back], WeatherHero[compact], DailyForecast, Note · `weather_air_uv`: Header[back], AirQuality, UvPollen, Note |
| `storm_alert` | Severe weather warnings and safety guidance | `weather_alerts`, `weather_alert_detail` | `weather_alerts`: Header, SevereAlert, RadarMap, Note · `weather_alert_detail`: Header[back], SevereAlert, Checklist, Note |
| `weather_radar` | Stepped radar/wind/temp layers and MinuteCast rain | `weather_radar_layers`, `weather_minutecast` | `weather_radar_layers`: Header, RadarMap[layers], Note · `weather_minutecast`: Header[back], HourlyForecast[minutecast], UvPollen, Note |
| `saved_cities` | Saved weather cities list and location search | `weather_city_list`, `weather_city_add` | `weather_city_list`: Header, Search, WeatherHero[compact], SectionTitle, List[cards], Button · `weather_city_add`: Header[back], Search, List, Note |

The first listed layout is each archetype's `defaultLayout`; all layout ids carry the `weather_` prefix and
are unique across the catalog. Recipes use only Core plus `weather`'s 8 components (superseding
`trips/Weather`), keep at most one dense component per layout, and keep screen weights within budget.

## Worked example: SkyPulse (standalone weather)

A standalone weather app for Seattle and saved travel cities loads `weather` exclusively (never `trips`).
Opening `weather_forecast/weather_today` displays `WeatherHero` ("54°F · Light Rain · Rain easing in 25m"),
a 24-hour `HourlyForecast` curve, `AirQuality` ("AQI 28 Good · Wind 12 mph SW · Pressure 1014 hPa"), and
`AstroSun` showing 9h 14m of daylight and a waxing gibbous moon at 76%. Swiping to `weather_outlook` renders
a 10-day `DailyForecast` where every row aligns its min/max bar against the week's 39°–61°F span. Checking
`weather_radar/weather_radar_layers` scrubs `RadarMap` forward `+90m`, while `storm_alert/weather_alerts`
displays an active Coastal Wind Advisory (`SevereAlert`) and `saved_cities/weather_city_list` compares
Seattle against saved cards in Core `List[cards]`. Signature: `count_up` on live metrics or `bars_grow` on
MinuteCast rain intensity bars.

## Tiers

`AstroSun` computes solar and lunar curves locally on the `phone`. Current conditions, hourly/daily
forecasts, radar frames, AQI/UV/pollen indexes, and CAP/NWS alerts (`WeatherHero`, `HourlyForecast`,
`DailyForecast`, `RadarMap`, `AirQuality`, `SevereAlert`, `UvPollen`) require weather data services
(`service`, `!needs-service`). GPS auto-detection and push severe/UV alerts request device location or
notification permission (`ok`, `!needs-ok`).

## Build notes

- Order: `WeatherHero`, `HourlyForecast`, `DailyForecast`, `RadarMap`, `AirQuality`, `SevereAlert`,
  `UvPollen`, `AstroSun`.
- Strict `writerFormat(registry)` permits only Core plus selected packs. Standalone weather briefs load
  `weather` and never `trips/Weather`; travel apps needing full radar/hourly views load `trips, weather`.
- Model writes only city identifiers, selected view ranges, units, and alert references; all meteorological
  values, curves, radar frames, and astronomical timestamps are host/service-computed.
- `DailyForecast` normalizes every `KitRangeBand` bar across `[min(days.low), max(days.high)]` so multi-day
  temperature bands align visually down the list; `meta.dense: true`, weight 3.
- `SevereAlert` keeps `warning` and `emergency` alerts non-dismissible until expired (`endsAt < now`); only
  `advisory` alerts expose `dismiss`.
- Compose every component strictly from existing kit bases (`KitCard`, `KitContent`, `KitRow`, `KitGrid`,
  `KitStrip`, `KitLinePlot`, `KitRangeBand`, `KitRadialTrack`, `KitMapTile`, `KitSlider`, `KitMeter`,
  `KitBars`, `KitTrack`, `KitChip`, `KitIcon`, `KitTime`, `KitTrail`, `KitAction`); no new kit base is
  needed.

## Open questions

- **Relation to `trips/Weather`?** Resolved: `weather`'s 8 components supersede `trips/Weather` for any
  standalone weather experience; `trips/Weather` stays a minimal trip-itinerary widget inside `trips`.
- **Full-screen 60fps Doppler radar & wind particles?** Default: continuous GPU vector/shader radar belongs
  in Core `Canvas` or a native map adapter; `RadarMap` renders stepped tile snapshots (`-1h` to `+2h`).
- **Saved cities switcher component?** Default: handled cleanly by `WeatherHero[compact]` + Core `Search` +
  Core `List[cards]` inside `saved_cities` without adding a ninth weather component id.
