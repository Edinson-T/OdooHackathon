import { threshold,todayRain,station } from "../../domain/warnings";
import {useEffect,useState} from "react";

import {
  Layers3,
  ClipboardList,
  CalendarClock,
  MessageSquareWarning,
} from "lucide-react";
import { useApp } from "../../app/provider";
import { Registry } from "../assets/Registry";
import { repository as repo } from "../../services/localRepository";
import { localDate } from "../../lib/clock";
import { go } from "../../components/ui";
import type { Reading } from "../../domain/types";
export function Dashboard() {
  const { s, busy, run,identity } = useApp();
  const [status,setStatus]=useState("");
  const [type,setType]=useState<"flooding"|"disease">("flooding");
  const zones=s!.zones;
  async function refresh(signal?:AbortSignal) {
    const results=await Promise.allSettled(zones.map(todayRain));
    const rows:Reading[]=results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
    let failed=results.filter(r=>r.status==="rejected").length;
    const feed=import.meta.env.VITE_SENSOR_FEED_URL;
    if(feed) try {
      const response=await fetch(feed,{signal});
      if(!response.ok) throw Error();
      const readings=await response.json() as Reading[];
      rows.push(...readings.filter(r=>r.type==="flooding" || r.type==="disease"));
    } catch {failed++;}
    if(signal?.aborted)return;
    const ok=rows.length && await run(()=>repo.recordReadings(rows));
    setStatus((ok?"Readings updated.":"No readings updated.")+(failed?" Some sources are unavailable.":""));
  }
  useEffect(()=>{
    const controller=new AbortController();
    void refresh(controller.signal);
    const timer=setInterval(()=>void refresh(controller.signal),15*60*1000);
    return ()=>{controller.abort();clearInterval(timer);};
  },[]);
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
        <h2>Environmental readings</h2>
        <p>Warnings appear above {threshold.rainfall} mm rain today or {threshold.flooding} m water level. Disease warnings require both microbial density above {threshold.disease} counts/mL and mosquito density above {threshold.mosquitoes} per trap-day.</p>
        <button disabled={busy} onClick={()=>void refresh()}>Refresh readings</button><p role="status">{status}</p>
        {s!.users.find(u=>u.id===identity)?.role==="admin" && <form className="form" onSubmit={e=>{
          e.preventDefault(); const data=new FormData(e.currentTarget);
          void run(()=>repo.recordReadings([{zoneId:String(data.get("station")),type,value:Number(data.get("value")),mosquitoes:type==="disease"?Number(data.get("mosquitoes")):undefined,observedAt:new Date().toISOString()}]),()=>"Sensor reading recorded.");
        }}>
          <h3>Record a sensor measurement</h3>
          <label>Sensor location<select name="station">{zones.map(z=><option key={z.id} value={z.id}>{station(z,type).map(n=>n.toFixed(4)).join(", ")}</option>)}</select></label>
          <label>Sensor<select value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="flooding">Water level</option><option value="disease">Microbe and mosquito monitor</option></select></label>
          <label>{type==="flooding"?"Water level (m)":"Microbial density (counts/mL)"}<input key={type} name="value" type="number" min="0" step="any" required/></label>
          {type==="disease" && <label>Mosquitoes per trap-day<input name="mosquitoes" type="number" min="0" step="any" required/></label>}
          <button disabled={busy}>Save measurement</button>
        </form>}
      </section>
    </>
  );
}
