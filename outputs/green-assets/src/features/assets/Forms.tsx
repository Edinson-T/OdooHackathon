import { useState, type FormEvent } from "react";
import { useApp } from "../../app/provider";
import {
  go,
  labels,
  KindIcon,
  Badge,
  Empty,
  dateText,
} from "../../components/ui";
import { repository as repo } from "../../services/localRepository";
import type { Asset, AssetType } from "../../domain/types";
import { localDate } from "../../lib/clock";
export function Report({ assetId }: { assetId?: string }) {
  const { s, identity, run, busy } = useApp();
  const [asset, A] = useState(assetId || s!.assets[0].id),
    [desc, D] = useState("");
  return (
    <>
      <h1>Report a problem</h1>
      <form
        className="panel form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              () =>
                repo.submitComplaint(
                  { actorId: identity },
                  { assetId: asset, description: desc },
                ),
              (r) => "Complaint recorded · " + r.complaint.id,
            )
          )
            go("/activity");
        }}
      >
        <label>
          Asset
          <select value={asset} onChange={(e) => A(e.target.value)}>
            {s!.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Describe the issue
          <textarea
            required
            minLength={10}
            maxLength={1000}
            value={desc}
            onChange={(e) => D(e.target.value)}
            placeholder="What did you observe at the asset?"
          />
        </label>
        <button className="primary" disabled={busy}>
          Submit complaint
        </button>
      </form>
    </>
  );
}
export function Admin({ editId }: { editId?: string }) {
  const { s, identity, run, busy } = useApp();
  const a = s!.assets.find((a) => a.id === editId),
    first = s!.zones[0];
  const [zone, Z] = useState(a?.zoneId || first.id),
    [lat, Y] = useState(
      String(a?.latitude ?? (first.bounds.north + first.bounds.south) / 2),
    ),
    [lng, X] = useState(String(a?.longitude ?? 4.4));
  if (s!.users.find((u) => u.id === identity)?.role !== "admin")
    return <Empty text="Choose the admin demo identity to manage assets." />;
  const bounds = s!.zones.find((z) => z.id === zone)!.bounds;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch = {
      name: String(f.get("name")),
      zoneId: zone,
      latitude: Number(lat),
      longitude: Number(lng),
      inspectionIntervalDays: Number(
        f.get("interval") ?? a?.inspectionIntervalDays,
      ),
      nextInspectionDue: String(f.get("due") ?? a?.nextInspectionDue),
    };
    const success = (asset: Asset) => asset.name + " saved.";
    if (
      await run(
        () =>
          a
            ? repo.updateAsset({ actorId: identity }, a.id, patch)
            : repo.createAsset(
                { actorId: identity },
                { ...patch, type: String(f.get("type")) as AssetType },
              ),
        success,
        true,
      )
    )
      go("/assets");
  }
  const locked =
    a && s!.jobs.some((j) => j.assetId === a.id && j.status !== "completed");
  return (
    <>
      <h1>{a ? "Edit asset" : "Asset administration"}</h1>
      <div className="panel form">
        <label>
          Edit existing asset
          <select
            value={editId || ""}
            onChange={(e) => go("/admin/" + e.target.value)}
          >
            <option value="">Add a new asset</option>
            {s!.assets.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <form className="panel form" onSubmit={submit}>
        <h2>{a ? a.name : "Add an asset"}</h2>
        <label>
          Asset name
          <input name="name" required maxLength={80} defaultValue={a?.name} />
        </label>
        <div className="twocol">
          <label>
            Asset type
            <select name="type" disabled={!!a} defaultValue={a?.type || "farm"}>
              {["farm", "pond", "solar_system"].map((k) => (
                <option key={k} value={k}>
                  {labels[k]}
                </option>
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
              {s!.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="twocol">
          <label>
            Latitude
            <input
              type="number"
              required
              step="any"
              min={bounds.south}
              max={bounds.north}
              value={lat}
              onChange={(e) => Y(e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              required
              step="any"
              min={bounds.west}
              max={bounds.east}
              value={lng}
              onChange={(e) => X(e.target.value)}
            />
          </label>
        </div>
        <div className="twocol">
          <label>
            Inspection interval (days)
            <input
              name="interval"
              disabled={locked}
              type="number"
              min="1"
              max="365"
              required
              defaultValue={a?.inspectionIntervalDays || 30}
            />
          </label>
          <label>
            Next inspection
            <input
              name="due"
              disabled={locked}
              type="date"
              required
              defaultValue={a?.nextInspectionDue || localDate(30)}
            />
          </label>
        </div>
        {locked && <p>Complete outstanding jobs to edit the schedule.</p>}
        <button disabled={busy} className="primary">
          Save asset
        </button>
      </form>
    </>
  );
}
export function Details({ id }: { id: string }) {
  const { s, identity } = useApp();
  const a = s!.assets.find((a) => a.id === id);
  if (!a) return <Empty text="Asset not found." />;
  const complaints = s!.complaints.filter((c) => c.assetId === id),
    jobs = s!.jobs.filter((j) => j.assetId === id).reverse();
  return (
    <>
      <a href="#/assets">Asset registry</a>
      <div className="pagetop">
        <div>
          <div className="eyebrow">
            {labels[a.type]} / {s!.zones.find((z) => z.id === a.zoneId)?.name}
          </div>
          <h1>{a.name}</h1>
          <Badge v={a.condition} />
        </div>
        <button className="primary" onClick={() => go("/report/" + id)}>
          Report a problem
        </button>
      </div>
      <section className="panel pad">
        <h2>Asset information</h2>
        <div className="facts">
          <div>
            Location
            <b>
              {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
            </b>
          </div>
          <div>
            Next inspection<b>{dateText(a.nextInspectionDue)}</b>
          </div>
          <div>
            Interval<b>{a.inspectionIntervalDays} days</b>
          </div>
          <div>
            Last inspection
            <b>
              {a.lastInspectedAt
                ? dateText(a.lastInspectedAt)
                : "No inspection yet"}
            </b>
          </div>
        </div>
        {s!.users.find((u) => u.id === identity)?.role === "admin" && (
          <a href={"#/admin/" + id}>Edit asset</a>
        )}
      </section>
      <section className="panel pad">
        <h2>Complaints</h2>
        {complaints.map((c) => (
          <div className="row" key={c.id}>
            <p>{c.description}</p>
            <Badge v={c.status} />
          </div>
        ))}
        {!complaints.length && <Empty text="No complaints recorded." />}
      </section>
      <section className="panel pad">
        <h2>Inspection history</h2>
        {jobs.map((j) => (
          <div className="record" key={j.id}>
            <div className="row">
              <b>
                <KindIcon kind={a.type} />{" "}
                {j.triggers.map((t) => labels[t.kind]).join(" · ")}
              </b>
              <Badge v={j.status} />
            </div>
            <small>
              {dateText(j.completedAt || j.createdAt)} ·{" "}
              {s!.users.find((u) => u.id === j.assigneeId)?.name ||
                "Unassigned"}
            </small>
            {j.inspection && (
              <>
                <p>{j.inspection.notes}</p>
                <Badge v={j.inspection.condition} />
                <details>
                  <summary>Checklist answers</summary>
                  {j.checklist.questions.map((q) => (
                    <p key={q.id}>
                      {q.label} ·{" "}
                      {j.inspection!.answers[q.id].replaceAll("_", " ")}
                    </p>
                  ))}
                </details>
              </>
            )}
          </div>
        ))}
        {!jobs.length && <Empty text="No inspections recorded." />}
      </section>
    </>
  );
}
