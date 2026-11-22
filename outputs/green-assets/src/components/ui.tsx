import type React from "react";
import { Sprout, Waves, Sun } from "lucide-react";
import { alertTitle } from "../domain/warnings";
import type { AssetType, Snapshot, Trigger } from "../domain/types";

export const labels: Record<string, string> = {
  farm: "Farm",
  pond: "Pond",
  solar_system: "Solar system",
  healthy: "Healthy",
  needs_attention: "Needs inspection",
  critical: "Critical",
  unknown: "Not yet inspected",
  available: "Open",
  assigned: "In progress",
  completed: "Done",
  due: "Scheduled",
  complaint: "Resident report",
  hazard: "Weather warning",
  weather: "Weather",
  open: "Open",
  reviewed_action_needed: "Reviewed, action needed",
  resolved: "Resolved",
  low: "Low",
  medium: "Medium",
  high: "High",
  watch: "Watch",
  warning: "Warning",
  live: "Live source",
  sensor: "Sensor feed",
  manual: "Entered by an admin",
  simulated: "Simulated",
};

// What caused a job, in words. A hazard is named by its alert, for example
// "High temperature warning".
export function reasons(s: Snapshot, triggers: Trigger[]) {
  return Array.from(
    new Set(
      triggers.map((t) => {
        if (t.kind !== "hazard") return labels[t.kind];
        const event = s.hazardEvents.find((e) => e.id === t.hazardEventId);
        if (!event) return labels.hazard;
        return event.type === "rainfall" ? "After heavy rain" : alertTitle(event.type);
      }),
    ),
  );
}

export function KindIcon({ kind, size = 18 }: { kind: AssetType; size?: number }) {
  const Icon = { farm: Sprout, pond: Waves, solar_system: Sun }[kind];
  return <Icon size={size} strokeWidth={1.75} />;
}

/** Small status tag: a coloured mark and a word. Deliberately not a pill. */
export function Badge({ v }: { v: string }) {
  return (
    <span className={"tag tag-" + v}>
      <i aria-hidden="true" />
      {labels[v] || v}
    </span>
  );
}

/** Hand-drawn style botanical sprig, used as the brand mark and as quiet dividers. */
export function Sprig({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={"sprig " + className} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 30c0-8 .4-15 2.6-22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.6 20c-4.2-.3-7.4-2.6-8.6-6.8 4.3-.1 7.5 2 8.6 6.8Z" fill="currentColor" opacity=".9" />
      <path d="M17.4 14.6c3.6-1 5.8-3.6 6.2-7.6-3.8.9-5.9 3.4-6.2 7.6Z" fill="currentColor" opacity=".75" />
      <path d="M18.6 8c.3-2.6 1.6-4.4 3.8-5.4-.2 2.5-1.4 4.3-3.8 5.4Z" fill="currentColor" opacity=".6" />
    </svg>
  );
}

/** Thin botanical rule: a line with a small leaf in the middle. */
export function LeafRule() {
  return (
    <div className="leafrule" aria-hidden="true">
      <span />
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
        <path d="M2 6h6M14 6h6" stroke="currentColor" strokeWidth="1" />
        <path d="M11 1.5c2.6 1.2 3.6 3 3 4.8-.6 1.8-2.4 2.8-3 4.2-.6-1.4-2.4-2.4-3-4.2-.6-1.8.4-3.6 3-4.8Z" fill="currentColor" opacity=".55" />
      </svg>
      <span />
    </div>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="leaf" width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 33C10 20 19 9 34 6c-1 15-10 26-23 27" fill="#527B55" />
        <path d="M8 33c6-8 12-13 20-19" stroke="#F3F7EF" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 35c1-2 2-3 3-4" stroke="#244B38" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>Greenward</span>
    </span>
  );
}

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="empty">
      <Sprig size={22} />
      <div>
        <p>{text}</p>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

export const dateText = (s: string) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Day/month parts for date stamps. */
export const dateParts = (s: string) => {
  const d = new Date(s.length === 10 ? s + "T12:00:00" : s);
  return { day: d.getDate(), month: d.toLocaleDateString("en-GB", { month: "short" }) };
};

export function go(path: string) {
  location.hash = path;
}

/**
 * Dark aubergine band at the top of every page (BetterHelp-style):
 * centred light headline with one highlighted word, a short line of text,
 * and optional extras (progress dashes, actions) underneath.
 */
export function Band({
  kicker,
  title,
  accent,
  after = "",
  text,
  children,
  left = false,
}: {
  kicker?: React.ReactNode;
  title: string;
  accent?: string;
  after?: string;
  text?: React.ReactNode;
  children?: React.ReactNode;
  left?: boolean;
}) {
  return (
    <section className={"band" + (left ? " left" : "")}>
      <div className="bandinner">
        {kicker && <div className="bandkicker">{kicker}</div>}
        <h1>
          {title}
          {accent && <em>{accent}</em>}
          {after}
        </h1>
        {text && <p>{text}</p>}
        {children}
      </div>
    </section>
  );
}

/** Segmented pill progress bar, as in a step-by-step questionnaire. */
export function Dashes({ total, done, label }: { total: number; done: number; label?: string }) {
  return (
    <div className="dashes" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label ?? `Step ${done} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < done ? "on" : ""} />
      ))}
    </div>
  );
}

/** White sheet that overlaps the band and holds the page content. */
export function Sheet({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={"sheet" + (narrow ? " narrow" : "")}>{children}</div>;
}
