import { Sprout, Waves, Sun, PackageOpen } from "lucide-react";
import type { AssetType } from "../domain/types";
export const labels: Record<string, string> = {
  farm: "Farm",
  pond: "Pond",
  solar_system: "Solar system",
  healthy: "Healthy",
  needs_attention: "Needs attention",
  critical: "Critical",
  unknown: "Unknown",
  available: "Available",
  assigned: "Assigned",
  completed: "Completed",
  due: "Due inspection",
  complaint: "Complaint",
  hazard: "Hazard",
  open: "Open",
  reviewed_action_needed: "Reviewed · action needed",
  resolved: "Resolved",
  low: "Low",
  medium: "Medium",
  high: "High",
};
export function KindIcon({
  kind,
  size = 19,
}: {
  kind: AssetType;
  size?: number;
}) {
  const Icon = { farm: Sprout, pond: Waves, solar_system: Sun }[kind];
  return <Icon size={size} />;
}
export function Badge({ v }: { v: string }) {
  return (
    <span className={"badge " + v}>
      <i />
      {labels[v] || v}
    </span>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <PackageOpen size={24} />
      <p>{text}</p>
    </div>
  );
}
export const dateText = (s: string) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function go(path: string) {
  location.hash = path;
}
