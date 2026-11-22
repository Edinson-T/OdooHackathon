import { activeEvents, byUrgency, currentReading, hazardNames, valueText } from "../../domain/warnings";
import { ArrowRight, Sprout, ClipboardList, CalendarClock, MessageCircle, TriangleAlert } from "lucide-react";
import { useApp } from "../../app/provider";
import { Registry } from "../assets/Registry";
import { HazardPanel, hazardIcons } from "../hazards/HazardPanel";
import type { HazardEvent } from "../../domain/types";
import { localDate } from "../../lib/clock";
import { go, KindIcon, labels, dateText, Band, Sheet } from "../../components/ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const { s, identity } = useApp();
  const me = s!.users.find((u) => u.id === identity);
  const today = localDate();
  const overdue = s!.assets.filter((a) => a.nextInspectionDue < today);
  const openJobs = s!.jobs.filter((j) => j.status === "available");
  const openComplaints = s!.complaints.filter((c) => c.status !== "resolved");
  const mine = s!.jobs.find((j) => j.status === "assigned" && j.assigneeId === identity);
  const alerts = activeEvents(s!).sort(byUrgency);
  const needing = s!.assets.filter((a) => a.condition === "needs_attention" || a.condition === "critical");
  const zoneName = (id: string) => s!.zones.find((z) => z.id === id)?.name ?? id;
  // One line per zone, listing every alert it has, instead of one line per alert.
  const byZone = new Map<string, HazardEvent[]>();
  alerts.forEach((e) => byZone.set(e.zoneId, [...(byZone.get(e.zoneId) ?? []), e]));
  const chipNames = { rainfall: "Rain", heat: "Heat", dengue: "Dengue" } as const;
  const firstName = me?.name.split(" ")[0] ?? "there";

  const sentence =
    alerts.length > 0
      ? `${alerts.length} hazard ${alerts.length === 1 ? "alert is" : "alerts are"} active, and ${openJobs.length} inspections are waiting for someone.`
      : openJobs.length > 0
        ? `No hazard alerts right now. ${openJobs.length} inspections are waiting for someone to pick them up.`
        : "No hazard alerts and no open inspections. A quiet day in the gardens.";

  return (
    <>
      <Band title={greeting() + ", "} accent={firstName} after="." text={sentence}>
        <div className="bandactions">
          {mine ? (
            <a className="btn primary" href={"#/inspect/" + mine.id}>
              Continue your inspection <ArrowRight size={16} />
            </a>
          ) : (
            <a className="btn primary" href="#/jobs">
              Find an inspection <ArrowRight size={16} />
            </a>
          )}
          <a className="btn onband" href="#/report">Report a problem</a>
        </div>
      </Band>
      <Sheet>
        <div className="tiles">
          <div className="tile">
            <span className="tileicon green"><Sprout size={18} /></span>
            <b>{s!.assets.length}</b>
            <span>Assets in care</span>
            <small>farms, ponds and solar systems</small>
          </div>
          <div className="tile">
            <span className="tileicon fig"><ClipboardList size={18} /></span>
            <b>{openJobs.length}</b>
            <span>Open inspections</span>
            <small>ready to pick up</small>
          </div>
          <div className={"tile" + (overdue.length ? " alert" : "")}>
            <span className="tileicon clay"><CalendarClock size={18} /></span>
            <b>{overdue.length}</b>
            <span>Overdue</span>
            <small>past their inspection date</small>
          </div>
          <div className="tile">
            <span className="tileicon lime"><MessageCircle size={18} /></span>
            <b>{openComplaints.length}</b>
            <span>Resident reports</span>
            <small>not yet resolved</small>
          </div>
        </div>

        <div className="overviewgrid">
          <div className="card">
            <Registry compact />
          </div>
          <aside className="card care">
            <h2>Needs care today</h2>
            <ul className="carelist">
              {[...byZone].map(([zoneId, here]) => {
                const Icon = here.length === 1 ? hazardIcons[here[0].type] : TriangleAlert;
                const readings = here
                  .map((e) => {
                    const r = currentReading(s!, zoneId, e.type);
                    return r ? valueText(e.type, r.value) + (e.type === "rainfall" ? " rain" : "") : hazardNames[e.type];
                  })
                  .join(" · ");
                return (
                  <li key={zoneId} className="warn">
                    <span className="careicon"><Icon size={16} /></span>
                    <div>
                      <b>{zoneName(zoneId)}</b>
                      <span className="carechips">
                        {here.map((e) => (
                          <span key={e.id} className={"zone-chip " + e.type} title={e.reason}>
                            {chipNames[e.type]}
                          </span>
                        ))}
                      </span>
                      <small>{readings}</small>
                    </div>
                  </li>
                );
              })}
              {alerts.length > 0 && (
                <li className="caremore">
                  <button className="linkbtn" onClick={() => document.querySelector(".hazards")?.scrollIntoView({ behavior: "smooth" })}>
                    Why? See Alerts by zone
                  </button>
                </li>
              )}
              {overdue.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <span className="careicon"><KindIcon kind={a.type} size={16} /></span>
                  <div>
                    <a href={"#/assets/" + a.id}>{a.name}</a>
                    <small>Inspection was due {dateText(a.nextInspectionDue)}</small>
                  </div>
                </li>
              ))}
              {needing
                .filter((a) => !overdue.includes(a))
                .slice(0, 3)
                .map((a) => (
                  <li key={a.id}>
                    <span className="careicon"><KindIcon kind={a.type} size={16} /></span>
                    <div>
                      <a href={"#/assets/" + a.id}>{a.name}</a>
                      <small>Last visit: {labels[a.condition].toLowerCase()}</small>
                    </div>
                  </li>
                ))}
              {!alerts.length && !overdue.length && !needing.length && <li className="calm">Nothing pressing today. Enjoy the quiet.</li>}
            </ul>
            {overdue.length > 4 && (
              <button className="linkbtn" onClick={() => go("/assets")}>
                See all {overdue.length} overdue assets
              </button>
            )}
          </aside>
        </div>

        <HazardPanel />
      </Sheet>
    </>
  );
}
