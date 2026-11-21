import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Map as MapIcon,
  Table2,
} from "lucide-react";
import { useApp } from "../../app/provider";
import {
  KindIcon,
  Badge,
  Empty,
  go,
  labels,
  dateText,
} from "../../components/ui";
import { AssetMap } from "./AssetMap";
import { localDate } from "../../lib/clock";
export function Registry() {
  const { s } = useApp();
  const [q, Q] = useState(""),
    [kind, K] = useState(""),
    [condition, C] = useState(""),
    [list, L] = useState(false);
  const assets = useMemo(
    () =>
      s!.assets.filter(
        (a) =>
          (!kind || a.type === kind) &&
          (!condition || a.condition === condition) &&
          a.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [s, q, kind, condition],
  );
  return (
    <>
      <section className="panel atlas">
        <div className="panelhead">
          <div>
            <div className="eyebrow">COMMUNITY ATLAS</div>
            <h2>Asset map</h2>
          </div>
          <div className="switch">
            <button className={!list ? "sel" : ""} onClick={() => L(false)}>
              <MapIcon size={15} />
              Map
            </button>
            <button className={list ? "sel" : ""} onClick={() => L(true)}>
              <Table2 size={15} />
              List
            </button>
          </div>
        </div>
        {list ? (
          <div className="maplist">
            {assets.map((a) => (
              <a key={a.id} href={"#/assets/" + a.id}>
                <KindIcon kind={a.type} />
                {a.name}
              </a>
            ))}
          </div>
        ) : (
          <AssetMap assets={assets} />
        )}
        <div className="legend">
          {["farm", "pond", "solar_system"].map((k) => (
            <span key={k}>
              <i className={k} />
              {labels[k]}
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panelhead">
          <div>
            <div className="eyebrow">FIELD RECORDS</div>
            <h2>Asset registry</h2>
          </div>
          <span className="subtle">{assets.length} assets</span>
        </div>
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input
              placeholder="Search assets…"
              aria-label="Search assets"
              value={q}
              onChange={(e) => Q(e.target.value)}
            />
          </label>
          <SlidersHorizontal size={16} />
          <select
            aria-label="Filter by type"
            value={kind}
            onChange={(e) => K(e.target.value)}
          >
            <option value="">All types</option>
            {["farm", "pond", "solar_system"].map((k) => (
              <option value={k} key={k}>
                {labels[k]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by condition"
            value={condition}
            onChange={(e) => C(e.target.value)}
          >
            <option value="">All conditions</option>
            {["healthy", "needs_attention", "critical", "unknown"].map((k) => (
              <option value={k} key={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Asset name</th>
                <th>Zone</th>
                <th>Condition</th>
                <th>Next inspection</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>
                    <button
                      className="assetname"
                      onClick={() => go("/assets/" + a.id)}
                    >
                      <span className={"kindbox " + a.type}>
                        <KindIcon kind={a.type} />
                      </span>
                      <span>
                        {a.name}
                        <small>{labels[a.type]}</small>
                      </span>
                    </button>
                  </td>
                  <td>{s!.zones.find((z) => z.id === a.zoneId)?.name}</td>
                  <td>
                    <Badge v={a.condition} />
                  </td>
                  <td
                    className={a.nextInspectionDue < localDate() ? "late" : ""}
                  >
                    {a.nextInspectionDue < localDate() ? "Overdue · " : ""}
                    {dateText(a.nextInspectionDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!assets.length && <Empty text="No assets match these filters." />}
      </section>
    </>
  );
}
