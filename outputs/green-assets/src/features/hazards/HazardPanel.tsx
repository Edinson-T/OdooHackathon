import { useEffect, useState } from "react";
import {
  Bug,
  CloudLightning,
  CloudRain,
  Dices,
  Megaphone,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Waves,
} from "lucide-react";
import { useApp } from "../../app/provider";
import { Badge } from "../../components/ui";
import { hazardConfig, simulation } from "../../domain/hazardConfig";
import {
  activeEvents,
  alertTitle,
  byUrgency,
  currentReading,
  fromFeed,
  todayRain,
  valueText,
} from "../../domain/warnings";
import { rainStrip } from "../../domain/scenario";
import type { HazardLevel, HazardType, Reading } from "../../domain/types";
import { repository as repo } from "../../services/localRepository";
import { RainStrip } from "./RainStrip";

// The strip shows two weeks at a time, and playing stops at the end of them.
const stripDays = 14;

const icons = { rainfall: CloudRain, flooding: Waves, mosquito: Bug };

// What to do about an alert. General measures only.
const advice: Record<HazardType, Record<HazardLevel, string>> = {
  rainfall: {
    watch: "Clear outlets and drainage channels before the rain arrives.",
    warning: "Check overflow paths and drainage once the rain eases.",
  },
  flooding: {
    watch: "The water is close to the warning level, or still falling from it.",
    warning: "Jobs in this zone open when the water has receded.",
  },
  mosquito: {
    watch: "Traps are close to the warning level.",
    warning: "Look for standing water: drain, empty, clear or cover it.",
  },
};

export function HazardPanel() {
  const { s, busy, run, identity } = useApp();
  const snapshot = s!;
  const { zones, scenario } = snapshot;
  const actor = { actorId: identity };
  const isAdmin = snapshot.users.find((u) => u.id === identity)?.role === "admin";
  const live = scenario.mode === "live";
  const [status, setStatus] = useState("");
  const [sensor, setSensor] = useState<"flooding" | "mosquito">("flooding");
  const [stormZone, setStormZone] = useState(zones[0]?.id ?? "");

  async function refresh(signal?: AbortSignal) {
    const results = await Promise.allSettled(zones.map(todayRain));
    const rows: Reading[] = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );
    let failed = results.filter((r) => r.status === "rejected").length;
    const feed = import.meta.env.VITE_SENSOR_FEED_URL;
    if (feed)
      try {
        const response = await fetch(feed, { signal });
        if (!response.ok) throw Error();
        const list: unknown = await response.json();
        if (!Array.isArray(list)) throw Error();
        rows.push(...list.flatMap((row) => fromFeed(row) ?? []));
      } catch {
        failed++;
      }
    if (signal?.aborted) return;
    const ok = rows.length && (await run(() => repo.recordReadings(rows)));
    setStatus(
      (ok ? "Readings updated." : "No readings updated.") +
        (failed ? " Some sources are unavailable." : ""),
    );
  }
  // Live sources are read on entry and every 15 minutes. The simulated
  // scenario moves only when an admin moves it.
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => void refresh(controller.signal), 15 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
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
  const zoneOrder = (id: string) => zones.findIndex((z) => z.id === id);
  const alerts = activeEvents(snapshot).sort(
    (a, b) => byUrgency(a, b) || zoneOrder(a.zoneId) - zoneOrder(b.zoneId),
  );
  const levelOf = (zoneId: string, type: HazardType) =>
    alerts.find((e) => e.zoneId === zoneId && e.type === type)?.level;
  const cell = (zoneId: string, type: HazardType) => {
    const reading = currentReading(snapshot, zoneId, type);
    const level = levelOf(zoneId, type);
    if (!reading) return <span className="subtle">Awaiting data</span>;
    return (
      <>
        {valueText(type, reading.value)}{" "}
        {/* A watch on rain comes from the forecast, so it is shown there. */}
        {level && (type !== "rainfall" || level === "warning") && <Badge v={level} />}
        {reading.note && <small>{reading.note}</small>}
      </>
    );
  };
  const m = simulation.mosquito;

  return (
    <section className="panel hazards">
      <div className="panelhead">
        <div>
          <div className="eyebrow">HAZARD MONITORING</div>
          <h2>Alerts and readings</h2>
        </div>
        {!live && (
          <span className="simtag">SIMULATED DATA · DAY {scenario.day + 1}</span>
        )}
      </div>
      <div className="pad">
        <p className="subtle">
          Alerts show where to look first. They are not forecasts of disease.
          The thresholds are illustrative values for this demo and have not
          been validated.
        </p>
        {/* Every member can run the scenario. Only an admin changes the data source. */}
        {(isAdmin || !live) && (
          <div className="hazardtools">
            <div className="actions">
              {isAdmin && (
              <div className="switch" role="group" aria-label="Data source">
                <button
                  className={live ? "sel" : ""}
                  aria-pressed={live}
                  disabled={busy}
                  onClick={() => {
                    if (!live)
                      void run(
                        () => repo.setMonitoring(actor, "live"),
                        () => "Live sources on. The simulated alerts have ended.",
                      );
                  }}
                >
                  Live sources
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
              )}
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
                  <button
                    disabled={busy || playing}
                    onClick={() => void advance()}
                  >
                    <SkipForward />
                    Next day
                  </button>
                  <select
                    aria-label="Zone for the storm"
                    value={stormZone}
                    onChange={(e) => setStormZone(e.target.value)}
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
                        () => repo.triggerStorm(actor, stormZone),
                        () => "Storm over " + zoneName(stormZone) + ".",
                      )
                    }
                  >
                    <CloudLightning />
                    Trigger storm
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setPlaying(false);
                      void run(
                        () => repo.restartScenario(actor),
                        () => "Scenario back at day 1.",
                      );
                    }}
                  >
                    <RotateCcw />
                    Restart
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setPlaying(false);
                      void run(
                        () =>
                          repo.restartScenario(
                            actor,
                            Math.floor(Math.random() * 1000000),
                          ),
                        (sc) => "New weather, seed " + sc.seed + ".",
                      );
                    }}
                  >
                    <Dices />
                    New random weather
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {!live && (
          <RainStrip
            days={rainStrip(zones, snapshot.assets, scenario, firstDay, lastDay)}
            today={scenario.day}
            zoneNames={zones.map((z) => z.name)}
            onJump={(day) => {
              if (!playing && day > scenario.day) void advance(day - scenario.day);
            }}
          />
        )}
        {alerts.length || snapshot.healthNotices.length ? (
          <ul className="alerts">
            {alerts.map((event) => {
              const Icon = icons[event.type];
              const count = event.affectedAssetIds.length;
              return (
                <li
                  key={event.id}
                  className={"alert " + event.type + " is-" + event.level}
                >
                  <Icon size={20} aria-hidden="true" />
                  <div className="grow">
                    <div className="row">
                      <b>
                        {alertTitle(event.type, event.level)} · {zoneName(event.zoneId)}
                      </b>
                      <span className="alerttags">
                        {event.simulated && <span className="simtag">SIMULATED</span>}
                        {event.source === "manual" && (
                          <span className="simtag">ENTERED BY HAND</span>
                        )}
                        <Badge v={event.level} />
                      </span>
                    </div>
                    <p>{event.reason}</p>
                    <small>
                      {advice[event.type][event.level]}
                      {count > 0 &&
                        ` Inspection requested at ${count} asset${count === 1 ? "" : "s"}.`}
                    </small>
                  </div>
                </li>
              );
            })}
            {snapshot.healthNotices.map((zoneId) => (
              <li key={zoneId} className="alert healthnotice">
                <Megaphone size={20} aria-hidden="true" />
                <div className="grow">
                  <div className="row">
                    <b>Public health notice · {zoneName(zoneId)}</b>
                    <span className="simtag">SIMULATED</span>
                  </div>
                  <p>
                    A dengue cluster was reported near this zone. An admin
                    entered this notice to stand in for one from the health
                    authority. This app does not detect disease.
                  </p>
                  <small>
                    While it is in effect, mosquito checks here open at the
                    watch threshold of {hazardConfig.mosquito.watch} per trap-day.
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="calm">No alerts in effect.</p>
        )}
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Rain today</th>
                <th>Forecast, next 24 h</th>
                <th>Water level</th>
                <th>Mosquito trap</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const rain = currentReading(snapshot, z.id, "rainfall");
                return (
                  <tr key={z.id}>
                    <td>{z.name}</td>
                    <td>{cell(z.id, "rainfall")}</td>
                    <td>
                      {rain?.forecast === undefined ? (
                        <span className="subtle">Awaiting data</span>
                      ) : (
                        <>
                          {valueText("rainfall", rain.forecast)}{" "}
                          {levelOf(z.id, "rainfall") === "watch" && <Badge v="watch" />}
                        </>
                      )}
                    </td>
                    <td>{cell(z.id, "flooding")}</td>
                    <td>{cell(z.id, "mosquito")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="subtle">
          Rain: warning above {hazardConfig.rainfall.warning} mm in a day, watch
          when the forecast is above it. Water level: watch above{" "}
          {hazardConfig.flooding.watch} m, warning above{" "}
          {hazardConfig.flooding.warning} m. Mosquito trap: watch above{" "}
          {hazardConfig.mosquito.watch}, warning above{" "}
          {hazardConfig.mosquito.warning} per trap-day. A level ends when the
          reading falls below {hazardConfig.clearRatio * 100}% of its threshold.
        </p>
        {live ? (
          <div className="actions">
            <button disabled={busy} onClick={() => void refresh()}>
              Refresh readings
            </button>
            <span role="status" className="subtle">
              {status}
            </span>
          </div>
        ) : (
          <details>
            <summary>How the simulated scenario works</summary>
            <ul className="notes">
              <li>
                The weather comes from a generator with a fixed seed (
                {scenario.seed}), so every device and every rehearsal sees the
                same days.
              </li>
              <li>
                Water level follows the rain and falls back by half each day.
                The river basin sits lowest, so its gauge rises most.
              </li>
              <li>
                Mosquito counts rise after water has stood for {m.lagDays}{" "}
                unbroken days. More rain does not simply mean more mosquitoes:
                a day with {m.flushMm} mm or more flushes larvae out and the
                count of days restarts.
              </li>
              <li>
                An asset inspected and found healthy lowers its zone's count
                for the next {m.controlDays} days.
              </li>
            </ul>
          </details>
        )}
        {isAdmin && (
          <div className="hazardtools more">
            {live && (
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  void run(
                    () =>
                      repo.recordReadings([
                        {
                          zoneId: String(data.get("zone")),
                          type: sensor,
                          value: Number(data.get("value")),
                          source: "manual",
                          observedAt: new Date().toISOString(),
                        },
                      ]),
                    () => "Sensor reading recorded.",
                  );
                }}
              >
                <h3>Record a sensor measurement</h3>
                <label>
                  Station zone
                  <select name="zone">
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sensor
                  <select
                    value={sensor}
                    onChange={(e) => setSensor(e.target.value as typeof sensor)}
                  >
                    <option value="flooding">Water level gauge</option>
                    <option value="mosquito">Mosquito trap</option>
                  </select>
                </label>
                <label>
                  {sensor === "flooding" ? "Water level (m)" : "Mosquitoes per trap-day"}
                  <input
                    key={sensor}
                    name="value"
                    type="number"
                    min="0"
                    step="any"
                    required
                  />
                </label>
                <button disabled={busy}>Save measurement</button>
              </form>
            )}
            <fieldset className="notices">
              <legend>Public health notice (simulated)</legend>
              {zones.map((z) => (
                <label key={z.id}>
                  <input
                    type="checkbox"
                    checked={snapshot.healthNotices.includes(z.id)}
                    disabled={busy}
                    onChange={(e) => {
                      const on = e.target.checked;
                      void run(
                        () => repo.setHealthNotice(actor, z.id, on),
                        () =>
                          "Public health notice " +
                          (on ? "entered for " : "withdrawn for ") +
                          z.name +
                          ".",
                      );
                    }}
                  />
                  Dengue cluster reported near {z.name}
                </label>
              ))}
            </fieldset>
          </div>
        )}
      </div>
    </section>
  );
}
