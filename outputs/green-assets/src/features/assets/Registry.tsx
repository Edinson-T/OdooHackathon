import { useMemo, useState } from "react";
import { Search, Map as MapIcon, List, MapPin } from "lucide-react";
import { useApp } from "../../app/provider";
import { KindIcon, Badge, Empty, go, labels, dateText, Band, Sheet } from "../../components/ui";
import { AssetMap } from "./AssetMap";
import { localDate } from "../../lib/clock";
import { HazardPanel } from "../hazards/HazardPanel";

const kinds = ["farm", "pond", "solar_system"] as const;

// `hazards` puts the alerts panel between the map and the table.
export function Registry({ compact = false, standalone = false, hazards = false }: { compact?: boolean; standalone?: boolean; hazards?: boolean }) {
  const { s } = useApp();
  const [q, Q] = useState(""),
    [kind, K] = useState(""),
    [condition, C] = useState(""),
    [list, L] = useState(false);
  const assets = useMemo(
    () =>
      s!.assets.filter(
        (a) => (!kind || a.type === kind) && (!condition || a.condition === condition) && a.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [s, q, kind, condition],
  );
  const today = localDate();
  const atlas = (
    <section className={"atlas" + (compact ? " compact" : "")}>
      <div className="atlashead">
        <h2>{compact ? "Your area" : "Map"}</h2>
        <div className="seg" role="group" aria-label="View">
          <button className={!list ? "on" : ""} onClick={() => L(false)} aria-pressed={!list}>
            <MapIcon size={14} /> Map
          </button>
          <button className={list ? "on" : ""} onClick={() => L(true)} aria-pressed={list}>
            <List size={14} /> List
          </button>
        </div>
      </div>
      {list ? (
        <ul className="maplist">
          {assets.map((a) => (
            <li key={a.id}>
              <a href={"#/assets/" + a.id}>
                <KindIcon kind={a.type} size={16} /> {a.name}
              </a>
              <Badge v={a.condition} />
            </li>
          ))}
        </ul>
      ) : (
        <AssetMap assets={assets} />
      )}
      <div className="mapkey">
        {kinds.map((k) => (
          <span key={k}>
            <i className={"swatch " + k} />
            {labels[k]}
          </span>
        ))}
        <span>
          <i className="zonekey" /> Zone with an alert
        </span>
        {(["rainfall", "heat", "dengue"] as const).map((k) => (
          <span key={k} className={"zone-chip " + k}>
            {{ rainfall: "Rain", heat: "Heat", dengue: "Dengue" }[k]}
          </span>
        ))}
        {s!.scenario.mode === "simulated" && <span className="simtag">Simulated data</span>}
        <span className="keyring">
          <MapPin size={13} /> {s!.zones.length} zones · ring colour shows the last condition
        </span>
      </div>
    </section>
  );
  if (compact) return atlas;
  const resetFilters = () => {
    Q("");
    K("");
    C("");
  };
  const body = (
    <>
      <div className="card">{atlas}</div>
      {hazards && <HazardPanel />}
      <section className="card registry">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input placeholder="Search assets" aria-label="Search assets" value={q} onChange={(e) => Q(e.target.value)} />
          </label>
          <select aria-label="Asset type" value={kind} onChange={(e) => K(e.target.value)}>
            <option value="">All types</option>
            {kinds.map((k) => (
              <option value={k} key={k}>{labels[k]}</option>
            ))}
          </select>
          <select aria-label="Condition" value={condition} onChange={(e) => C(e.target.value)}>
            <option value="">Any condition</option>
            {["healthy", "needs_attention", "critical", "unknown"].map((k) => (
              <option value={k} key={k}>{labels[k]}</option>
            ))}
          </select>
          {(q || kind || condition) && (
            <button className="linkbtn" onClick={resetFilters}>
              Clear
            </button>
          )}
          <span className="count">
            {assets.length} of {s!.assets.length}
          </span>
        </div>
        <div className="tablewrap">
          <table className="data assets">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Zone</th>
                <th>Condition</th>
                <th>Last visit</th>
                <th className="r">Next inspection</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const late = a.nextInspectionDue < today;
                return (
                  <tr key={a.id} onClick={() => go("/assets/" + a.id)} className="clickrow">
                    <td>
                      <a className="assetcell" href={"#/assets/" + a.id} onClick={(e) => e.stopPropagation()}>
                        <span className={"kind " + a.type}>
                          <KindIcon kind={a.type} size={16} />
                        </span>
                        <span>
                          <b>{a.name}</b>
                          <small>{labels[a.type]}</small>
                        </span>
                      </a>
                    </td>
                    <td className="muted">{s!.zones.find((z) => z.id === a.zoneId)?.name}</td>
                    <td>
                      <Badge v={a.condition} />
                    </td>
                    <td className="muted">{a.lastInspectedAt ? dateText(a.lastInspectedAt) : "Never"}</td>
                    <td className={"r" + (late ? " late" : "")}>
                      {late && <span className="overdue">Overdue</span>}
                      {dateText(a.nextInspectionDue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!assets.length && <Empty text="No assets match." hint="Try another type or clear the search." />}
      </section>
    </>
  );
  if (!standalone) return body;
  return (
    <>
      <Band title="Every green space, " accent="in one place" after="." text={`The ${s!.assets.length} farms, ponds and solar systems we look after. Select one to see its history or report a problem.`} />
      <Sheet>{body}</Sheet>
    </>
  );
}
