import { PinPicker } from "./PinPicker";
import { MiniMap } from "./MiniMap";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../../app/provider";
import { go, labels, KindIcon, Badge, Empty, dateText, Band, Sheet, Dashes, reasons } from "../../components/ui";
import { activeEvents, alertTitle } from "../../domain/warnings";
import { repository as repo } from "../../services/localRepository";
import type { Asset, AssetType } from "../../domain/types";
import { localDate } from "../../lib/clock";

import { riskOf } from "../../domain/risk";
import { riskConfig } from "../../domain/riskConfig";
import { RiskBadge } from "../../components/RiskBadge";

/** Step-by-step report, one question at a time. */
export function Report({ assetId }: { assetId?: string }) {
  const { s, identity, run, busy } = useApp();
  const preset = s!.assets.find((a) => a.id === assetId);
  const [kind, setKind] = useState<string>(preset?.type ?? "");
  const [asset, setAsset] = useState<string>(preset?.id ?? "");
  const [step, setStep] = useState(preset ? 2 : 0);
  const [desc, D] = useState("");
  const chosen = s!.assets.find((a) => a.id === asset);
  const titles = ["What kind of place is it?", "Which one?", "What did you notice?"];
  return (
    <>
      <Band title="Report a " accent="problem" after="." text="Three quick questions. Your report goes straight onto the inspection list, and a neighbour will go and check.">
        <Dashes total={3} done={step + 1} label={`Question ${step + 1} of 3`} />
      </Band>
      <section className="quizcard inapp">
        <div className="quizhead">{chosen ? "Reporting on " + chosen.name : "Tell us where it is."}</div>
        <div className="quizbody">
          {step > 0 && (
            <button className="quizback" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2>{titles[step]}</h2>
          {step === 0 && (
            <div className="options">
              {(["farm", "pond", "solar_system"] as const).map((k) => (
                <button
                  key={k}
                  className={"option" + (kind === k ? " on" : "")}
                  onClick={() => {
                    setKind(k);
                    if (chosen?.type !== k) setAsset("");
                    setStep(1);
                  }}
                >
                  <KindIcon kind={k} size={18} /> {labels[k]}
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="options">
              {s!.assets
                .filter((a) => a.type === kind)
                .map((a) => (
                  <button
                    key={a.id}
                    className={"option" + (asset === a.id ? " on" : "")}
                    onClick={() => {
                      setAsset(a.id);
                      setStep(2);
                    }}
                  >
                    {a.name}
                  </button>
                ))}
            </div>
          )}
          {step === 2 && chosen && (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => repo.submitComplaint({ actorId: identity }, { assetId: asset, description: desc }), (r) => "Thank you. Report saved as " + r.complaint.id.slice(0, 8) + "."))
                  go("/activity");
              }}
            >
              <label>
                Describe it in a sentence or two
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  value={desc}
                  onChange={(e) => D(e.target.value)}
                  placeholder="For example: the pond outlet is blocked with branches and the water smells."
                />
                <small className="hint">{desc.trim().length < 10 ? "At least 10 characters." : `${desc.trim().length} / 1000`}</small>
              </label>
              <button className="btn primary wide" disabled={busy || desc.trim().length < 10}>
                Send report
              </button>
            </form>
          )}
          <p className="quiznote">
            {step === 2 ? "A neighbour will claim it and visit with a short checklist. You'll see the outcome under My activity." : "Not sure? Pick the closest match. The inspector will check on site."}
          </p>
        </div>
      </section>
    </>
  );
}

export function Admin({ editId }: { editId?: string }) {
  const { s, identity, run, busy } = useApp();
  const a = s!.assets.find((a) => a.id === editId),
    first = s!.zones[0];
  const [zone, Z] = useState(a ? a.zoneId ?? "" : first.id),
    [lat, Y] = useState(String(a?.latitude ?? (first.bounds.north + first.bounds.south) / 2)),
    [lng, X] = useState(String(a?.longitude ?? 4.4));
  if (s!.users.find((u) => u.id === identity)?.role !== "admin") return <Empty text="Only administrators can manage assets." hint="Switch to the administrator demo account to try it." />;
  const bounds = s!.zones.find((z) => z.id === zone)?.bounds;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch = {
      name: String(f.get("name")),
      zoneId: zone || undefined,
      latitude: Number(lat),
      longitude: Number(lng),
      inspectionIntervalDays: Number(f.get("interval") ?? a?.inspectionIntervalDays),
      nextInspectionDue: String(f.get("due") ?? a?.nextInspectionDue),
    };
    const success = (asset: Asset) => asset.name + " saved.";
    if (
      await run(
        () => (a ? repo.updateAsset({ actorId: identity }, a.id, patch) : repo.createAsset({ actorId: identity }, { ...patch, type: String(f.get("type")) as AssetType })),
        success,
        true,
      )
    )
      go("/assets");
  }
  const locked = a && s!.jobs.some((j) => j.assetId === a.id && j.status !== "completed");
  return (
    <>
      <Band title={a ? "Edit " : "Add a "} accent={a ? a.name : "green space"} text={a ? "Update the details or move its pin." : "Register a new farm, pond or solar system, then drop its pin on the map."} />
      <Sheet>
      <header className="pagehead withside">
        <label className="picker">
          <span>Working on</span>
          <select value={editId || ""} onChange={(e) => go("/admin/" + e.target.value)}>
            <option value="">A new asset</option>
            {s!.assets.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
      </header>
      <form className="adminform" onSubmit={submit}>
        <div className="card form">
          <section>
            <h3><span className="step">1</span> The basics</h3>
            <label>
              Name
              <input name="name" required maxLength={80} defaultValue={a?.name} placeholder="e.g. Lindenhof Community Garden" />
            </label>
            <label>
              Type
              <select name="type" disabled={!!a} defaultValue={a?.type || "farm"}>
                {["farm", "pond", "solar_system"].map((k) => (
                  <option key={k} value={k}>{labels[k]}</option>
                ))}
              </select>
            </label>
            <label>
              Zone
              <select
                value={zone}
                onChange={(e) => {
                  const z = s!.zones.find((z) => z.id === e.target.value)!;
                  Z(z.id);
                  Y(((z.bounds.north + z.bounds.south) / 2).toFixed(4));
                  X(((z.bounds.west + z.bounds.east) / 2).toFixed(4));
                }}
              >
                {a && !a.zoneId && <option value="" disabled>Saved location (no zone)</option>}
                {s!.zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </label>
          </section>
          <section>
            <h3><span className="step">2</span> Inspection rhythm</h3>
            <fieldset className="row2">
              <label>
                Every (days)
                <input name="interval" disabled={locked} type="number" min="1" max="365" required defaultValue={a?.inspectionIntervalDays || 30} />
              </label>
              <label>
                Next inspection
                <input name="due" disabled={locked} type="date" required defaultValue={a?.nextInspectionDue || localDate(30)} />
              </label>
            </fieldset>
            {locked && <p className="hint">This asset has an inspection in progress. Finish it before changing the schedule.</p>}
          </section>
          <div className="formactions">
            <button disabled={busy} className="btn primary">Save asset</button>
            <a className="linkbtn" href="#/assets">Cancel</a>
          </div>
        </div>
        <section className="card pinpanel">
          <h3><span className="step">3</span> Place it on the map</h3>
          <p className="muted">{bounds ? "Click inside the outlined zone to drop the pin where the asset is." : "Select a zone to move this pin."}</p>
          {bounds && <PinPicker key={zone} bounds={bounds} latitude={Number(lat)} longitude={Number(lng)} onPick={(lat, lng) => { Y(String(lat)); X(String(lng)); }} />}
          <p className="coords">{Number(lat).toFixed(4)}° N, {Number(lng).toFixed(4)}° E</p>
        </section>
      </form>
      </Sheet>
    </>
  );
}

export function Details({ id }: { id: string }) {
  const { s, identity } = useApp();
  const a = s!.assets.find((a) => a.id === id);
  if (!a) return <Empty text="We couldn't find that asset." hint="It may have been removed." />;
  const risk = riskOf(s!, a, localDate());
  const complaints = s!.complaints.filter((c) => c.assetId === id),
    jobs = s!.jobs.filter((j) => j.assetId === id).reverse();
  const late = a.nextInspectionDue < localDate();
  const admin = s!.users.find((u) => u.id === identity)?.role === "admin";
  return (
    <>
      <Band
        kicker={
          <a className="backlink onband" href="#/assets">
            <ArrowLeft size={15} /> All assets
          </a>
        }
        title={a.name}
        text={
          <span className="bandmeta">
            <KindIcon kind={a.type} size={16} /> {labels[a.type]} · {s!.zones.find((z) => z.id === a.zoneId)?.name} · <Badge v={a.condition} />
            {activeEvents(s!)
              .filter((e) => e.zoneId === a.zoneId)
              .map((e) => (
                <span key={e.id} className={"tag alert " + e.level} title={e.reason}>
                  {alertTitle(e.type)} in this zone
                </span>
              ))}
          </span>
        }
      >
        <div className="bandactions">
          <a className="btn primary" href={"#/report/" + id}>Report a problem</a>
          {admin && <a className="btn onband" href={"#/admin/" + id}>Edit</a>}
        </div>
      </Band>
      <Sheet>
      <div className="assetbody">
        <aside className="card">
          <MiniMap asset={a} zone={s!.zones.find((z) => z.id === a.zoneId)} />
          <dl className="facts">
            <div><dt>Next inspection</dt><dd className={late ? "late" : ""}>{dateText(a.nextInspectionDue)}{late && " · overdue"}</dd></div>
            <div><dt>Checked every</dt><dd>{a.inspectionIntervalDays} days</dd></div>
            <div><dt>Last visit</dt><dd>{a.lastInspectedAt ? dateText(a.lastInspectedAt) : "Not yet"}</dd></div>
            <div><dt>Location</dt><dd className="mono">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</dd></div>
            <div><dt>In the registry since</dt><dd>{dateText(a.createdAt)}</dd></div>
          </dl>
          <h3 className="minihead">Resident reports <span>{complaints.length}</span></h3>
          {complaints.map((c) => (
            <blockquote className="complaint" key={c.id}>
              <p>{c.description}</p>
              <footer>
                {s!.users.find((u) => u.id === c.reporterId)?.name ?? "A resident"}, {dateText(c.createdAt)} · <Badge v={c.status} />
              </footer>
            </blockquote>
          ))}
          {!complaints.length && <p className="muted">Nobody has reported a problem here.</p>}
        </aside>
        <section className="card">
          <h2>History</h2>
          <ol className="timeline">
            {jobs.map((j) => (
              <li key={j.id} className={"t-" + j.status}>
                <div className="tdate">{dateText(j.completedAt || j.createdAt)}</div>
                <div className="tbody">
                  <div className="thead">
                    <b>{reasons(s!, j.triggers).join(" + ")}</b>
                    <Badge v={j.status} />
                  </div>
                  <small className="muted">{s!.users.find((u) => u.id === j.assigneeId)?.name || "Nobody has claimed it yet"}</small>
                  {j.inspection && (
                    <>
                      <p>{j.inspection.notes}</p>
                      <div className="tfoot">
                        <span className="muted">Found:</span> <Badge v={j.inspection.condition} />
                      </div>
                      <details>
                        <summary>Checklist</summary>
                        <ul className="checks">
                          {j.checklist.questions.map((q) => (
                            <li key={q.id} className={"a-" + j.inspection!.answers[q.id]}>
                              <span>{q.label}</span>
                              <b>{j.inspection!.answers[q.id].replaceAll("_", " ")}</b>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {!jobs.length && <Empty text="No inspections yet." />}
        </section>
      <section className="card">
        <div className="toolbar">
          <h2>Inspection priority</h2>
          <RiskBadge risk={risk} />
        </div>
        <p className="muted">
          A way to decide which asset to inspect first. It is not a forecast of
          disease. The numbers are placeholders chosen by the team and have not
          been validated.
        </p>
        <div className="tablewrap">
          <table className="risktable">
            <thead>
              <tr>
                <th>Part</th>
                <th>Points</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {risk.parts.map((p) => (
                <tr key={p.key}>
                  <td>{p.name}</td>
                  <td>
                    {p.points} of {p.max}
                  </td>
                  <td>{p.reason}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>Total</b>
                </td>
                <td>
                  <b>{risk.score} of 100</b>
                </td>
                <td>
                  Inspect first from {riskConfig.levels.inspectFirst}, this week from{" "}
                  {riskConfig.levels.thisWeek}, routine below that.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      </div>
      </Sheet>
    </>
  );
}
