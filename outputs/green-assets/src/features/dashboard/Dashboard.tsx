import { useState } from "react";
import {
  Layers3,
  ClipboardList,
  CalendarClock,
  MessageSquareWarning,
  CloudRain,
  CalendarCheck2,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../../app/provider";
import { Registry } from "../assets/Registry";
import { repository as repo } from "../../services/localRepository";
import { localDate } from "../../lib/clock";
import { go } from "../../components/ui";
import type { HazardEvent } from "../../domain/types";
export function Dashboard() {
  const { s, busy, run } = useApp();
  const [show, S] = useState(false),
    [type, T] = useState<HazardEvent["type"]>("flooding"),
    [zone, Z] = useState(s!.zones[0].id);
  const stats = [
    {
      name: "Registered assets",
      value: s!.assets.length,
      icon: Layers3,
      css: "green",
      note: "In the community",
    },
    {
      name: "Available jobs",
      value: s!.jobs.filter((j) => j.status === "available").length,
      icon: ClipboardList,
      css: "blue",
      note: "Ready to claim",
    },
    {
      name: "Overdue inspections",
      value: s!.assets.filter((a) => a.nextInspectionDue < localDate()).length,
      icon: CalendarClock,
      css: "amber",
      note: "Past their due date",
    },
    {
      name: "Open complaints",
      value: s!.complaints.filter((c) => c.status !== "resolved").length,
      icon: MessageSquareWarning,
      css: "rose",
      note: "Awaiting resolution",
    },
  ];
  return (
    <>
      <div className="pagetop">
        <div>
          <div className="eyebrow">WORKSPACE / OVERVIEW</div>
          <h1>Community overview</h1>
          <p>Your green assets, inspections, and community reports.</p>
        </div>
        <button className="primary" onClick={() => go("/report")}>
          ＋ Report a problem
        </button>
      </div>
      <div className="stats">
        {stats.map((x) => (
          <div className="stat" key={x.name}>
            <div className="statline">
              <span>{x.name}</span>
              <x.icon className={"tile " + x.css} />
            </div>
            <strong>{String(x.value).padStart(2, "0")}</strong>
            <small>{x.note}</small>
          </div>
        ))}
      </div>
      <Registry />
      <section className="panel pad">
        <h2>Demo controls</h2>
        <div className="actions">
          <button
            disabled={busy}
            onClick={() =>
              run(
                () => repo.createDueJobs(localDate()),
                (r) =>
                  r.createdJobIds.length +
                  " jobs created · " +
                  r.updatedJobIds.length +
                  " updated · " +
                  r.skippedTriggerKeys.length +
                  " already tracked.",
              )
            }
          >
            <CalendarCheck2 />
            Check due inspections
          </button>
          <button onClick={() => S(!show)}>
            <CloudRain />
            Simulate hazardous event
          </button>
        </div>
        {show && (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => repo.simulateHazard({ zoneId: zone, type }),
                ({ event, result }) =>
                  "Simulated " +
                  type +
                  " · " +
                  event.affectedAssetIds.length +
                  " affected assets · " +
                  result.createdJobIds.length +
                  " new jobs.",
              );
            }}
          >
            <label>
              Simulated event
              <select
                value={type}
                onChange={(e) => T(e.target.value as typeof type)}
              >
                <option value="flooding">Flooding</option>
                <option value="rainfall">Rainfall</option>
              </select>
            </label>
            <label>
              Affected zone
              <select value={zone} onChange={(e) => Z(e.target.value)}>
                {s!.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy} className="primary">
              Run simulation
            </button>
          </form>
        )}
        {s!.hazardEvents
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id} className="row">
              <span>
                Simulated {e.type} ·{" "}
                {s!.zones.find((z) => z.id === e.zoneId)?.name} ·{" "}
                {e.affectedAssetIds.length} assets
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => repo.replayHazard(e.id),
                    (r) =>
                      r.skippedTriggerKeys.length +
                      " triggers already recorded.",
                  )
                }
              >
                <RotateCcw />
                Replay event
              </button>
            </div>
          ))}
      </section>
    </>
  );
}
