import { useState } from "react";
import { useApp } from "../../app/provider";
import { repository as repo } from "../../services/localRepository";
import { labels, KindIcon, Badge, Empty, go, dateText, dateParts, Band, Sheet, Dashes, reasons } from "../../components/ui";
import type { InspectionJob } from "../../domain/types";
import { localDate } from "../../lib/clock";
import type { CompletionInput } from "../../services/repository";

export function Jobs({ mine = false }: { mine?: boolean }) {
  const { s, identity, busy, run } = useApp();
  const [type, T] = useState(""),
    [reason, R] = useState("");
  const occupied = s!.jobs.some((j) => j.status === "assigned" && j.assigneeId === identity);
  const jobs = s!.jobs
    .filter(
      (j) =>
        (mine ? j.assigneeId === identity : j.status === "available") &&
        (!type || s!.assets.find((a) => a.id === j.assetId)?.type === type) &&
        (!reason || j.triggers.some((t) => t.kind === reason)),
    )
    .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || a.createdAt.localeCompare(b.createdAt));
  const complaints = s!.complaints.filter((c) => c.reporterId === identity).reverse();
  const today = localDate();
  const upcoming = s!.assets.filter((a) => !type || type === a.type).slice().sort((a, b) => a.nextInspectionDue.localeCompare(b.nextInspectionDue));
  const done = s!.jobs.filter((j) => j.assigneeId === identity && j.status === "completed").length;
  return (
    <>
      <Band
        title={mine ? "Your " : "Pick up an "}
        accent={mine ? "visits and reports" : "inspection"}
        after="."
        text={
          mine
            ? done
              ? `You've completed ${done} inspection${done === 1 ? "" : "s"}. Thank you for looking after the neighbourhood.`
              : "Inspections you claim and problems you report will show up here."
            : "One visit at a time: finish your current inspection before claiming the next. Scheduled visits open 24 hours before their date."
        }
      />
      <Sheet>
      <div className={mine ? "jobsgrid mine" : "jobsgrid"}>
        <section className="card">
          <div className="toolbar">
            <h2>{mine ? "My inspections" : "Open inspections"}</h2>
            <select aria-label="Asset type" value={type} onChange={(e) => T(e.target.value)}>
              <option value="">All assets</option>
              {["farm", "pond", "solar_system"].map((o) => (
                <option key={o} value={o}>{labels[o]}</option>
              ))}
            </select>
            <select aria-label="Reason" value={reason} onChange={(e) => R(e.target.value)}>
              <option value="">Any reason</option>
              {["due", "complaint", "hazard"].map((o) => (
                <option key={o} value={o}>{labels[o]}</option>
              ))}
            </select>
          </div>
          <ol className="workorders">
            {jobs.map((j) => {
              const a = s!.assets.find((x) => x.id === j.assetId)!;
              const due = j.triggers.find((t) => t.kind === "due");
              const stamp = dateParts(due?.kind === "due" ? due.dueDate : j.createdAt);
              const urgent = j.triggers.some((t) => t.kind === "hazard");
              return (
                <li key={j.id} className={"wo s-" + j.status + (urgent ? " urgent" : "")}>
                  <div className="stamp">
                    <b>{stamp.day}</b>
                    <span>{stamp.month}</span>
                  </div>
                  <div className="woinfo">
                    <a className="woname" href={"#/assets/" + a.id}>
                      <KindIcon kind={a.type} size={15} /> {a.name}
                    </a>
                    <div className="woreasons">
                      <span className="wozone">{s!.zones.find((z) => z.id === a.zoneId)?.name}</span>
                      {reasons(s!, j.triggers).map((r) => (
                        <span key={r} className={"reason r-" + (j.triggers.find((t) => labels[t.kind] === r)?.kind ?? "hazard")}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="woaction">
                    {j.status === "available" ? (
                      <button
                        className="btn"
                        disabled={busy || occupied}
                        title={occupied ? "Finish your current inspection first" : undefined}
                        onClick={async () => {
                          if (await run(() => repo.claimJob({ actorId: identity }, j.id), () => "It's yours. Head over when you can.")) go("/activity");
                        }}
                      >
                        {occupied ? "Busy" : "Claim"}
                      </button>
                    ) : j.status === "assigned" ? (
                      <a className="btn primary" href={"#/inspect/" + j.id}>Start checklist</a>
                    ) : (
                      <Badge v="completed" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {!jobs.length && (
            <Empty
              text={mine ? "You haven't claimed any inspections yet." : "No open jobs match."}
              hint={mine ? "Open jobs are listed under Inspection jobs." : "Everything here has been picked up. Check back later."}
            />
          )}
        </section>

        {!mine && (
          <aside className="card upcoming">
            <h2>Coming up</h2>
            <p className="muted">Every asset, by next inspection date. Claims open 24 hours before the date, at local midnight.</p>
            {!s!.dueChecks && (
              <div className="duecheck">
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => repo.createDueJobs(localDate(), true),
                      (r) => (r.createdJobIds.length + r.updatedJobIds.length ? "Inspections that are due are now jobs." : "No inspection is due yet."),
                    )
                  }
                >
                  Check due inspections
                </button>
                <small className="muted">Inspections that are due become jobs once this check has run.</small>
              </div>
            )}
            <ul>
              {upcoming.map((a) => (
                <li key={a.id} className={a.nextInspectionDue < today ? "late" : ""}>
                  <a href={"#/assets/" + a.id}>{a.name}</a>
                  <time>{a.nextInspectionDue < today ? "overdue" : dateText(a.nextInspectionDue)}</time>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {mine && (
          <aside className="card myreports">
            <h2>Problems I reported</h2>
            {complaints.map((c) => (
              <article key={c.id} className="myreport">
                <div className="thead">
                  <a href={"#/assets/" + c.assetId}>{s!.assets.find((a) => a.id === c.assetId)?.name}</a>
                  <Badge v={c.status} />
                </div>
                <p>{c.description}</p>
                <small className="muted">
                  {dateText(c.createdAt)} · ref. {c.id.slice(0, 8)}
                </small>
              </article>
            ))}
            {!complaints.length && <Empty text="You haven't reported anything yet." hint="Noticed something off? Use Report a problem." />}
          </aside>
        )}
      </div>
      </Sheet>
    </>
  );
}

export function Inspect({ job }: { job: InspectionJob }) {
  const { s, identity, run, busy } = useApp();
  const a = s!.assets.find((x) => x.id === job.assetId)!;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<"" | "healthy" | "needs_attention">("");
  if (job.status !== "assigned" || job.assigneeId !== identity) return <Empty text="Only the person who claimed this job can fill in the checklist." />;
  const failed = Object.values(answers).includes("fail");
  // Anything not done (a failed check) means the asset needs inspection, so that is chosen for the volunteer.
  const condition = failed ? "needs_attention" : picked;
  const total = job.checklist.questions.length,
    answered = Object.keys(answers).length;
  return (
    <>
      <Band
        kicker={"Inspection · " + labels[a.type]}
        title={a.name}
        text={"Walk around the asset and answer each question. Requested by: " + reasons(s!, job.triggers).join(" + ") + "."}
      >
        <Dashes total={total} done={answered} label={`${answered} of ${total} questions answered`} />
      </Band>
      <form
        className="quizcard inapp checklist"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const input: CompletionInput = {
            answers: Object.fromEntries(job.checklist.questions.map((q) => [q.id, f.get(q.id)])) as CompletionInput["answers"],
            notes: String(f.get("notes")),
            condition: f.get("condition") as CompletionInput["condition"],
            resolvedComplaintIds: f.getAll("resolved").map(String),
          };
          if (await run(() => repo.completeJob({ actorId: identity }, job.id, input), () => "Inspection saved. Thank you!")) go("/assets/" + a.id);
        }}
      >
        <div className="quizhead">Checklist</div>
        <div className="quizbody">
        <ol className="questions">
          {job.checklist.questions.map((q, i) => (
            <li key={q.id}>
              <span className="qn">{i + 1}</span>
              <span className="ql">{q.label}</span>
              <div className="tri" role="radiogroup" aria-label={q.label}>
                {(["pass", "fail", "not_applicable"] as const).map((v) => (
                  <label key={v} className={"t-" + v + (answers[q.id] === v ? " on" : "")}>
                    <input type="radio" name={q.id} value={v} required onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
                    {v === "pass" ? "Pass" : v === "fail" ? "Fail" : "N/A"}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="form">
          <fieldset>
            <legend>Overall, the asset is…</legend>
            <div className="choice">
              {(["healthy", "needs_attention"] as const).map((k) => (
                <label key={k} className={"c-" + k}>
                  <input type="radio" name="condition" value={k} required checked={condition === k} disabled={k === "healthy" && failed} onChange={() => setPicked(k)} />
                  <span>
                    <b>{labels[k]}</b>
                    <small>{k === "healthy" ? "Everything looks fine." : "Something needs fixing or a follow-up."}</small>
                  </span>
                </label>
              ))}
            </div>
            {failed && <p className="hint">A check was not done, so the asset is marked as needing inspection.</p>}
          </fieldset>
          <label>
            Notes
            <textarea name="notes" required maxLength={2000} placeholder="What did you see? What did you do?" />
          </label>
          {job.triggers.flatMap((t) =>
            t.kind === "complaint"
              ? [
                  <label className="check" key={t.key}>
                    <input type="checkbox" name="resolved" value={t.complaintId} />
                    <span>
                      Resolved: “{s!.complaints.find((c) => c.id === t.complaintId)?.description}”
                    </span>
                  </label>,
                ]
              : [],
          )}
          <div className="formactions">
            <button disabled={busy} className="btn primary">Submit inspection</button>
            <a className="linkbtn" href="#/activity">Back to my activity</a>
          </div>
        </div>
        </div>
      </form>
    </>
  );
}
