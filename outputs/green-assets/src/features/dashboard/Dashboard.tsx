import {
  Layers3,
  ClipboardList,
  CalendarClock,
  MessageSquareWarning,
} from "lucide-react";
import { useApp } from "../../app/provider";
import { Registry } from "../assets/Registry";
import { localDate } from "../../lib/clock";
import { go } from "../../components/ui";
export function Dashboard() {
  const { s } = useApp();
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
      <Registry hazards />
    </>
  );
}
