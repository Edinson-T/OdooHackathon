// The rules that turn a reading into a watch or a warning, and the words that
// explain which rule fired. Thresholds live in hazardConfig.ts.
import { hazardConfig, jobRules } from "./hazardConfig.ts";
import type {
  AssetType,
  HazardEvent,
  HazardLevel,
  HazardType,
  Reading,
  Snapshot,
  Zone,
} from "./types";

export const hazardTypes: HazardType[] = ["rainfall", "flooding", "mosquito"];
export const hazardNames: Record<HazardType, string> = {
  rainfall: "Heavy rain",
  flooding: "Flood",
  mosquito: "Mosquito breeding",
};
export const stationNames: Record<HazardType, string> = {
  rainfall: "Rain gauge",
  flooding: "Water level gauge",
  mosquito: "Mosquito trap",
};

export const alertTitle = (type: HazardType, level: HazardLevel) =>
  hazardNames[type] + " " + level;

// Which warning comes first: a warning before a watch, then a flood before
// rain before mosquitoes.
const gravity: HazardType[] = ["flooding", "rainfall", "mosquito"];
export function byUrgency(
  a: Pick<HazardEvent, "type" | "level">,
  b: Pick<HazardEvent, "type" | "level">,
) {
  return (
    Number(b.level === "warning") - Number(a.level === "warning") ||
    gravity.indexOf(a.type) - gravity.indexOf(b.type)
  );
}

const tidy = (value: number, places = 1) =>
  String(Math.round(value * 10 ** places) / 10 ** places);

// A reading with its unit, for example "1.52 m".
export function valueText(type: HazardType, value: number) {
  if (type === "flooding") return value.toFixed(2) + " m";
  return tidy(value) + (type === "rainfall" ? " mm" : " per trap-day");
}

// Thresholds for a gauge or a trap. While a public health notice is in effect
// in the zone, a mosquito count above the watch threshold is already a warning.
function limits(type: "flooding" | "mosquito", notice: boolean) {
  const { watch, warning } = hazardConfig[type];
  return type === "mosquito" && notice ? { watch, warning: watch } : { watch, warning };
}

// The level a reading calls for. `current` is the level of the warning already
// active for that zone and type, if any: a level is entered above its
// threshold and left only below `clearRatio` times that threshold.
export function nextLevel(
  type: HazardType,
  reading: Pick<Reading, "value" | "forecast">,
  current: HazardLevel | null,
  notice = false,
): HazardLevel | null {
  if (type === "rainfall") {
    const limit = hazardConfig.rainfall.warning;
    if (reading.value > limit) return "warning";
    return (reading.forecast ?? 0) > limit ? "watch" : null;
  }
  const { watch, warning } = limits(type, notice);
  const held = (limit: number) => reading.value > limit * hazardConfig.clearRatio;
  if (reading.value > warning || (current === "warning" && held(warning)))
    return "warning";
  if (reading.value > watch || (current !== null && held(watch))) return "watch";
  return null;
}

// Why a zone is at this level, in one sentence a visitor can check.
export function explain(
  type: HazardType,
  level: HazardLevel,
  reading: Pick<Reading, "value" | "forecast">,
  notice = false,
) {
  if (type === "rainfall") {
    const limit = hazardConfig.rainfall.warning + " mm warning threshold.";
    return level === "warning"
      ? `Rain today is ${tidy(reading.value)} mm, above the ${limit}`
      : `The forecast for the next 24 hours is ${tidy(reading.forecast ?? 0)} mm, above the ${limit}`;
  }
  const { watch, warning } = limits(type, notice);
  const limit = level === "warning" ? warning : watch;
  const unit = type === "flooding" ? " m" : "";
  const measured =
    type === "flooding"
      ? `Water level is ${valueText(type, reading.value)}`
      : `The trap count is ${valueText(type, reading.value)}`;
  if (reading.value <= limit)
    return `${measured}. The ${level} stays until it falls below ${tidy(limit * hazardConfig.clearRatio, 2)}${unit}.`;
  const basis =
    notice && type === "mosquito" && level === "warning"
      ? "threshold that applies while a public health notice is in effect"
      : level + " threshold";
  return `${measured}, above the ${limit}${unit} ${basis}.`;
}

export const jobTypes = (type: HazardType, level: HazardLevel): AssetType[] =>
  jobRules[type][level];

export function fieldDate(time: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(
    new Date(time),
  );
}

// A reading counts while it is from today. A simulated reading counts until
// the scenario moves on, whatever the calendar says.
export function currentReading(
  s: Pick<Snapshot, "readings">,
  zoneId: string,
  type: HazardType,
  at = new Date().toISOString(),
) {
  return s.readings.find(
    (r) =>
      r.zoneId === zoneId &&
      r.type === type &&
      (r.source === "simulated" || fieldDate(r.observedAt) === fieldDate(at)),
  );
}

// Warnings that are in effect now: not cleared, and backed by a current reading.
export function activeEvents(
  s: Pick<Snapshot, "hazardEvents" | "readings">,
  at = new Date().toISOString(),
): HazardEvent[] {
  return s.hazardEvents.filter(
    (e) => e.clearedAt === null && currentReading(s, e.zoneId, e.type, at),
  );
}

// Nobody is sent into a zone while its water level is at warning.
export function flooded(s: Pick<Snapshot, "hazardEvents" | "readings">, zoneId: string) {
  return activeEvents(s).some(
    (e) => e.zoneId === zoneId && e.type === "flooding" && e.level === "warning",
  );
}

export function station(z: Zone, type: HazardType): [number, number] {
  const b = z.bounds,
    fraction = type === "rainfall" ? 0.25 : type === "flooding" ? 0.5 : 0.75;
  return [(b.north + b.south) / 2, b.west + (b.east - b.west) * fraction];
}

// Rain measured so far today and forecast for the next 24 hours, from Open-Meteo.
// Rain and showers are added: showers are the convective part, where storms sit.
export async function todayRain(zone: Zone): Promise<Reading> {
  const [lat, lng] = station(zone, "rainfall");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "rain,showers",
    current: "rain",
    timezone: "Europe/Brussels",
    forecast_days: "2",
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw Error("Weather service unavailable.");
  const data = await response.json();
  const hours: string[] = data.hourly.time;
  const part = (v: unknown) => (typeof v === "number" ? v : NaN);
  const mm = hours.map(
    (_, i) => part(data.hourly.rain[i]) + part(data.hourly.showers[i]),
  );
  if (!mm.length || mm.some((v) => !Number.isFinite(v)))
    throw Error("Incomplete rainfall readings.");
  const elapsed = hours.filter((h) => h <= data.current.time).length;
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  return {
    zoneId: zone.id,
    type: "rainfall",
    value: sum(mm.slice(0, elapsed)),
    forecast: sum(mm.slice(elapsed, elapsed + 24)),
    source: "live",
    observedAt: new Date().toISOString(),
  };
}

// One row of a sensor feed. Older feeds sent a "disease" row with a microbial
// count in `value` and the trap count in `mosquitoes`: the trap count is kept.
export function fromFeed(row: unknown): Reading | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const legacy = r.type === "disease";
  const type = legacy ? "mosquito" : r.type;
  const value = legacy ? r.mosquitoes : r.value;
  if (
    (type !== "flooding" && type !== "mosquito") ||
    typeof r.zoneId !== "string" ||
    typeof value !== "number" ||
    typeof r.observedAt !== "string"
  )
    return null;
  return { zoneId: r.zoneId, type, value, source: "sensor", observedAt: r.observedAt };
}
