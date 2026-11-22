import { useEffect, useState } from "react";
import {
  Bug,
  CloudRain,
  Dices,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  ThermometerSun,
  Zap,
} from "lucide-react";
import { useApp } from "../../app/provider";
import { hazardConfig, simulation } from "../../domain/hazardConfig";
import {
  activeEvents,
  byUrgency,
  currentReading,
  hazardNames,
  hazardTypes,
  todayWeather,
  valueText,
} from "../../domain/warnings";
import { rainStrip } from "../../domain/scenario";
import type { HazardType, Reading } from "../../domain/types";
import { repository as repo } from "../../services/localRepository";
import { RainStrip } from "./RainStrip";

// The strip shows two weeks at a time, and playing stops at the end of them.
const stripDays = 14;

export const hazardIcons = { rainfall: CloudRain, heat: ThermometerSun, dengue: Bug };

// What happens because of an alert. General measures only.
const advice: Record<HazardType, string> = {
  rainfall:
    "Solar panels here get an inspection job on the first day the rain is back under the threshold.",
  heat: "Farms here were given an inspection job.",
  dengue:
    "Look for standing water: drain, empty, clear or cover it. This alert creates no job.",
};
const triggerNames: Record<HazardType, string> = {
  rainfall: "Storm",
  heat: "Heatwave",
  dengue: "Dengue report",
};

export function HazardPanel() {
  const { s, busy, run, identity } = useApp();
  const snapshot = s!;
  const { zones, scenario } = snapshot;
  const actor = { actorId: identity };
  const live = scenario.mode === "live";
  const [status, setStatus] = useState("");
  const [zone, setZone] = useState(zones[0]?.id ?? "");
  const [kind, setKind] = useState<HazardType>("rainfall");

  async function refresh() {
    const results = await Promise.allSettled(zones.map(todayWeather));
    const rows: Reading[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    const failed = results.some((r) => r.status === "rejected");
    const ok = rows.length && (await run(() => repo.recordReadings(rows)));
    setStatus(
      (ok ? "Weather updated." : "No weather updated.") +
        (failed ? " The weather service did not answer for every zone." : ""),
    );
  }
  // Live weather is read on entry and every 15 minutes. The simulated
  // scenario moves only when someone moves it.
  useEffect(() => {
    if (!live) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [live]);

  // Playing moves the scenario on one day at a time, slowly enough to read
  // each day, and stops at the end of the two weeks on the strip.
  const [playing, setPlaying] = useState(false);
  const firstDay = Math.floor(scenario.day / stripDays) * stripDays;
  const lastDay = firstDay + stripDays - 1;
  const advance = (days = 1) =>
    run(
      () => repo.advanceScenario(actor, days),
      (sc) => "Scenario day " + (sc.day + 1) + ".",
    );
  useEffect(() => {
    if (!playing) return;
    if (live || scenario.day >= lastDay) {
      setPlaying(false);
      return;
    }
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(
      () => void advance().then((ok) => ok || setPlaying(false)),
      slow ? 2500 : 1500,
    );
    return () => clearTimeout(timer);
  }, [playing, live, scenario.day]);

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id;
  const alerts = activeEvents(snapshot);
  const restart = (seed?: number) => {
    setPlaying(false);
    void run(
      () => repo.restartScenario(actor, seed),
      (sc) =>
        (seed === undefined ? "Scenario back at day 1." : "New weather, seed " + sc.seed + ".") +
        " Jobs it had created were deleted.",
    );
  };

  return (
    <section className="panel hazards">
      <div className="panelhead">
        <div>
          <div className="eyebrow">HAZARD MONITORING</div>
          <h2>Alerts by zone</h2>
        </div>
        {!live && (
          <span className="simtag">SIMULATED DATA · DAY {scenario.day + 1}</span>
        )}
      </div>
      <div className="pad">
        <p className="subtle">
          Alerts show where to look first. The thresholds are illustrative
          values for this demo and have not been validated. The dengue feed is
          simulated: this app does not detect or forecast disease.
        </p>
        {/* Everyone, member or admin, can change the data source and run the scenario. */}
          <div className="hazardtools">
            <div className="actions">
                <div className="switch" role="group" aria-label="Data source">
                  <button
                    className={live ? "sel" : ""}
                    aria-pressed={live}
                    disabled={busy}
                    onClick={() => {
                      setPlaying(false);
                      if (!live)
                        void run(
                          () => repo.setMonitoring(actor, "live"),
                          () => "Live weather on. The scenario and its jobs were removed.",
                        );
                    }}
                  >
                    Live weather
                  </button>
                  <button
                    className={live ? "" : "sel"}
                    aria-pressed={!live}
                    disabled={busy}
                    onClick={() => {
                      if (live)
                        void run(
                          () => repo.setMonitoring(actor, "simulated"),
                          (sc) => "Simulated scenario on, day " + (sc.day + 1) + ".",
                        );
                    }}
                  >
                    Simulated scenario
                  </button>
                </div>
              {!live && (
                <>
                  <button
                    className="primary"
                    aria-pressed={playing}
                    onClick={() => {
                      if (playing) setPlaying(false);
                      // From the last day on the strip, play starts the next two weeks.
                      else if (scenario.day >= lastDay)
                        void advance().then((ok) => ok && setPlaying(true));
                      else setPlaying(true);
                    }}
                  >
                    {playing ? <Pause /> : <Play />}
                    {playing ? "Pause" : "Play"}
                  </button>
                  <button disabled={busy || playing} onClick={() => void advance()}>
                    <SkipForward />
                    Next day
                  </button>
                  <button disabled={busy} onClick={() => restart()}>
                    <RotateCcw />
                    Restart
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => restart(Math.floor(Math.random() * 1000000))}
                  >
                    <Dices />
                    New random weather
                  </button>
                </>
              )}
            </div>
            {!live && (
              <div className="actions">
                <span className="subtle">Trigger today</span>
                <select
                  aria-label="What to trigger"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as HazardType)}
                >
                  {hazardTypes.map((type) => (
                    <option key={type} value={type}>
                      {triggerNames[type]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Zone to trigger it in"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => repo.triggerHazard(actor, zone, kind),
                      () => triggerNames[kind] + " in " + zoneName(zone) + ".",
                    )
                  }
                >
                  <Zap />
                  Trigger
                </button>
              </div>
            )}
          </div>
        {!live && (
          <RainStrip
            days={rainStrip(zones, scenario, firstDay, lastDay)}
            today={scenario.day}
            zoneNames={zones.map((z) => z.name)}
            onJump={(day) => {
              if (!playing && day > scenario.day) void advance(day - scenario.day);
            }}
          />
        )}
        {/* One card per zone. Each hazard has its own tile, so one, two or all
            three alerts in a zone read the same way. */}
        <div className="zonecards">
          {zones.map((z) => {
            const here = alerts.filter((e) => e.zoneId === z.id).sort(byUrgency);
            return (
              <article
                key={z.id}
                className={"zonecard" + (here.length ? " alerted" : "")}
              >
                <header>
                  <h3>{z.name}</h3>
                  <span className={"tally" + (here.length ? " on" : "")}>
                    {here.length === 0
                      ? "No alerts"
                      : here.length === 1
                        ? "1 alert"
                        : here.length + " alerts at once"}
                  </span>
                </header>
                <div className="tiles">
                  {hazardTypes.map((type) => {
                    const Icon = hazardIcons[type];
                    const reading = currentReading(snapshot, z.id, type);
                    const on = here.some((e) => e.type === type);
                    return (
                      <div key={type} className={"tile3 " + type + (on ? " on" : "")}>
                        <Icon size={18} aria-hidden="true" />
                        <span className="what">{hazardNames[type]}</span>
                        <b>{reading ? valueText(type, reading.value) : "Awaiting data"}</b>
                        <span className="state">{on ? "WARNING" : "Normal"}</span>
                      </div>
                    );
                  })}
                </div>
                {here.length > 0 && (
                  <ul className="because">
                    {here.map((e) => (
                      <li key={e.id} className={e.type}>
                        <b>{e.reason}</b> {advice[e.type]}
                        {e.source === "manual" && " Entered by hand."}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
        <p className="subtle">
          Heavy rain: more than {hazardConfig.rainfall.warning} mm in a day.
          High temperature: above {hazardConfig.heat.warning} °C. Dengue: the
          feed answers yes or no for each zone, and a yes stays in effect for{" "}
          {simulation.dengue.days} days.
        </p>
        {live && (
          <div className="actions">
            <button disabled={busy} onClick={() => void refresh()}>
              Refresh weather
            </button>
            <span role="status" className="subtle">
              {status}
            </span>
          </div>
        )}
        {live && (
          <fieldset className="notices">
            <legend>Dengue feed (simulated)</legend>
            {zones.map((z) => (
              <label key={z.id}>
                <input
                  type="checkbox"
                  checked={alerts.some((e) => e.zoneId === z.id && e.type === "dengue")}
                  disabled={busy}
                  onChange={(e) => {
                    const on = e.target.checked;
                    void run(
                      () =>
                        repo.recordReadings([
                          {
                            zoneId: z.id,
                            type: "dengue",
                            value: on ? 1 : 0,
                            source: "manual",
                            observedAt: new Date().toISOString(),
                          },
                        ]),
                      () => "Dengue feed for " + z.name + ": " + (on ? "yes." : "no."),
                    );
                  }}
                />
                Dengue reported in {z.name}
              </label>
            ))}
          </fieldset>
        )}
      </div>
    </section>
  );
}
