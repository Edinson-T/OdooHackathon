import { useState } from "react";
import { useApp } from "../../app/provider";
import { repository as repo } from "../../services/localRepository";
import {
  labels,
  KindIcon,
  Badge,
  Empty,
  go,
  dateText,
  reasons,
} from "../../components/ui";
import type { InspectionJob } from "../../domain/types";
import type { CompletionInput } from "../../services/repository";
export function Jobs({ mine = false }: { mine?: boolean }) {
  const { s, identity, busy, run } = useApp();
  const [type, T] = useState(""),
    [reason, R] = useState("");
  const occupied = s!.jobs.some(j => j.status === "assigned" && j.assigneeId === identity);
  const jobs = s!.jobs
    .filter(
      (j) =>
        (mine ? j.assigneeId === identity : j.status === "available") &&
        (!type || s!.assets.find((a) => a.id === j.assetId)?.type === type) &&
        (!reason || j.triggers.some((t) => t.kind === reason)),
    )
    .sort(
      (a, b) =>
        Number(a.status === "completed") - Number(b.status === "completed") ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const complaints = s!.complaints
    .filter((c) => c.reporterId === identity)
    .reverse();
  return (
    <>
      <div className="eyebrow">COMMUNITY WORKSPACE</div>
      <h1>{mine ? "My activity" : "Inspection jobs"}</h1>
      <p className="lede">
        {mine
          ? "Your inspections and reported issues."
          : "Claim an available job to inspect a community asset."}
      </p>
      <section className="panel pad">
        <h2>{mine ? "My inspections" : "Available jobs"}</h2>
        <div className="filters">
          {[
            [type, T, "Asset type", ["farm", "pond", "solar_system"]],
            [reason, R, "Reason", ["due", "complaint", "hazard"]],
          ].map((entry) => {
            const [value, change, title, options] = entry as [
              string,
              (v: string) => void,
              string,
              string[],
            ];
            return (
              <select
                key={title}
                aria-label={title}
                value={value}
                onChange={(e) => change(e.target.value)}
              >
                <option value="">{title} · All</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {labels[o]}
                  </option>
                ))}
              </select>
            );
          })}
        </div>
        {jobs.map((j) => {
          const a = s!.assets.find((x) => x.id === j.assetId)!;
          return (
            <div key={j.id} className="jobrow">
              <span className={"kindbox " + a.type}>
                <KindIcon kind={a.type} />
              </span>
              <div className="grow">
                <a className="recordname" href={"#/assets/" + a.id}>
                  {a.name}
                </a>
                <small>
                  {s!.zones.find((z) => z.id === a.zoneId)?.name} ·{" "}
                  {j.triggers.filter(t => t.kind === "due").map(t => t.dueDate + " · ")}
                  {reasons(s!, j.triggers).join(" + ")}
                </small>
              </div>
              <Badge v={j.status} />
              {j.status === "available" ? (
                <button
                  disabled={busy || occupied}
                  onClick={async () => {
                    if (
                      await run(
                        () => repo.claimJob({ actorId: identity }, j.id),
                        () => "Job claimed.",
                      )
                    )
                      go("/activity");
                  }}
                >
                  {occupied ? "Finish current inspection first" : "Claim job"}
                </button>
              ) : j.status === "assigned" ? (
                <>

                  <a className="button primary" href={"#/inspect/" + j.id}>
                    Inspect
                  </a>
                </>
              ) : null}
            </div>
          );
        })}
        {!jobs.length && (
          <Empty
            text={
              mine
                ? "No inspections match your activity."
                : "No available jobs match these filters."
            }
          />
        )}
      </section>
      {!mine && <section className="panel pad"><h2>Upcoming inspections</h2>
        <p>Claims open 24 hours before the inspection date, at local midnight.</p>
        {s!.assets.filter(a => !type || type === a.type).slice().sort((a,b) => a.nextInspectionDue.localeCompare(b.nextInspectionDue)).map(a =>
          <div className="row" key={a.id}><a href={"#/assets/" + a.id}>{a.name}</a><time>{a.nextInspectionDue}</time></div>)}
      </section>}
      {mine && (
        <section className="panel pad">
          <h2>My complaints</h2>
          {complaints.map((c) => (
            <div className="record" key={c.id}>
              <div className="row">
                <a href={"#/assets/" + c.assetId}>
                  {s!.assets.find((a) => a.id === c.assetId)?.name}
                </a>
                <Badge v={c.status} />
              </div>
              <p>{c.description}</p>
              <small>
                Tracking ID · {c.id} · {dateText(c.createdAt)}
              </small>
            </div>
          ))}
          {!complaints.length && (
            <Empty text="You have not reported any issues yet." />
          )}
        </section>
      )}
    </>
  );
}
export function Inspect({ job }: { job: InspectionJob }) {
  const { s, identity, run, busy } = useApp();
  const a = s!.assets.find((x) => x.id === job.assetId)!;
  if (job.status !== "assigned" || job.assigneeId !== identity)
    return (
      <Empty text="Only the assigned member can submit this inspection." />
    );
  return (
    <>
      <div className="eyebrow">FIELD INSPECTION</div>
      <h1>{a.name}</h1>
      <form
        className="panel form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const input: CompletionInput = {
            answers: Object.fromEntries(
              job.checklist.questions.map((q) => [q.id, f.get(q.id)]),
            ) as CompletionInput["answers"],
            notes: String(f.get("notes")),
            condition: f.get("condition") as CompletionInput["condition"],
            resolvedComplaintIds: f.getAll("resolved").map(String),
          };
          if (
            await run(
              () => repo.completeJob({ actorId: identity }, job.id, input),
              () => "Inspection completed.",
            )
          )
            go("/assets/" + a.id);
        }}
      >
        <h2>Inspection checklist</h2>
        <p className="subtle">Requested by: {reasons(s!, job.triggers).join(" + ")}</p>
        {job.checklist.questions.map((q) => (
          <label key={q.id}>
            {q.label}
            <select name={q.id} required defaultValue="">
              <option value="" disabled>
                Select observation
              </option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </label>
        ))}
        <label>
          Observed condition
          <select name="condition" required defaultValue="">
            <option value="" disabled>
              Select condition
            </option>
            {["healthy", "needs_attention"].map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inspection notes
          <textarea name="notes" required maxLength={2000} />
        </label>
        {job.triggers.flatMap((t) =>
          t.kind === "complaint"
            ? [
                <label className="check" key={t.key}>
                  <input
                    type="checkbox"
                    name="resolved"
                    value={t.complaintId}
                  />{" "}
                  Confirm resolved:{" "}
                  {
                    s!.complaints.find((c) => c.id === t.complaintId)
                      ?.description
                  }
                </label>,
              ]
            : [],
        )}
        <button disabled={busy} className="primary">
          Submit inspection
        </button>
      </form>
    </>
  );
}
