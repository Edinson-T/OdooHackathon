// The rules that turn a reading into an alert, and the words that explain
// which rule fired. Thresholds live in hazardConfig.ts.
import { hazardConfig } from "./hazardConfig.ts";
import type { HazardEvent, HazardType, Reading, Snapshot, Zone } from "./types";

export const hazardTypes: HazardType[] = ["rainfall", "heat", "dengue"];
export const hazardNames: Record<HazardType, string> = {
  rainfall: "Heavy rain",
  heat: "High temperature",
  dengue: "Dengue and mosquito",
};
export const stationNames: Record<HazardType, string> = {
  rainfall: "Rain gauge",
  heat: "Thermometer",
  dengue: "Health authority feed",
};

export const alertTitle = (type: HazardType) => hazardNames[type] + " warning";

const tidy = (value: number) => String(Math.round(value * 10) / 10);

// A reading with its unit, for example "31.4 °C".
export function valueText(type: HazardType, value: number) {
  if (type === "dengue") return value > 0 ? "Dengue reported" : "No report";
  return tidy(value) + (type === "rainfall" ? " mm" : " °C");
}

// Does this reading call for an alert?
export function exceeds(reading: Pick<Reading, "type" | "value">) {
  if (reading.type === "dengue") return reading.value > 0;
  return reading.value > hazardConfig[reading.type].warning;
}

// Why a zone has this alert, in one sentence a visitor can check.
export function explain(reading: Pick<Reading, "type" | "value">) {
  if (reading.type === "rainfall")
    return `Rain today is ${tidy(reading.value)} mm, above the ${hazardConfig.rainfall.warning} mm threshold.`;
  if (reading.type === "heat")
    return `Today's highest temperature is ${tidy(reading.value)} °C, above the ${hazardConfig.heat.warning} °C threshold.`;
  return "The health authority feed reports dengue in this zone. It answers yes or no and gives no number of cases.";
}

// The order alerts are listed in.
export function byUrgency(a: Pick<HazardEvent, "type">, b: Pick<HazardEvent, "type">) {
  return hazardTypes.indexOf(a.type) - hazardTypes.indexOf(b.type);
}

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

// Alerts that are in effect now: not cleared, and backed by a current reading.
export function activeEvents(
  s: Pick<Snapshot, "hazardEvents" | "readings">,
  at = new Date().toISOString(),
): HazardEvent[] {
  return s.hazardEvents.filter(
    (e) => e.clearedAt === null && currentReading(s, e.zoneId, e.type, at),
  );
}

export function station(z: Zone, type: HazardType): [number, number] {
  const b = z.bounds,
    fraction = type === "rainfall" ? 0.25 : type === "heat" ? 0.5 : 0.75;
  return [(b.north + b.south) / 2, b.west + (b.east - b.west) * fraction];
}

// Today's weather for a zone from Open-Meteo: rain so far with the forecast
// for the next 24 hours, and the highest temperature so far. Rain and showers
// are added: showers are the convective part, where storms sit.
export async function todayWeather(zone: Zone): Promise<Reading[]> {
  const [lat, lng] = station(zone, "rainfall");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "rain,showers,temperature_2m",
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
  const degrees = hours.map((_, i) => part(data.hourly.temperature_2m[i]));
  const elapsed = hours.filter((h) => h <= data.current.time).length;
  if (!elapsed || [...mm, ...degrees].some((v) => !Number.isFinite(v)))
    throw Error("Incomplete weather readings.");
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const common = {
    zoneId: zone.id,
    source: "live" as const,
    observedAt: new Date().toISOString(),
  };
  return [
    {
      ...common,
      type: "rainfall",
      value: sum(mm.slice(0, elapsed)),
      forecast: sum(mm.slice(elapsed, elapsed + 24)),
    },
    { ...common, type: "heat", value: Math.max(...degrees.slice(0, elapsed)) },
  ];
}
