import { exceeds,fieldDate,station } from "../../domain/warnings";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { KindIcon, go } from "../../components/ui";
import { useApp } from "../../app/provider";
import type { Asset } from "../../domain/types";
export function AssetMap({ assets }: { assets: Asset[] }) {
  const el = useRef<HTMLDivElement>(null),
    { s } = useApp();
  useEffect(() => {
    if (!el.current || !s) return;
    const map = L.map(el.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      zoomSnap: 0.1,
    });
    const bounds = L.latLngBounds([50.85, 4.33], [50.91, 4.47]);
    map.fitBounds(bounds, { padding: [8, 10] });
    L.control.zoom({ position: "topright" }).addTo(map);
    const street = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    );
    street.addTo(map);
    s.zones.forEach((z) => {
      for(const type of ["rainfall","flooding","disease"] as const) {
        const r=s.readings.find(r=>r.zoneId===z.id && r.type===type && fieldDate(r.observedAt)===fieldDate(new Date().toISOString()));
        const warning=r && exceeds(r);
        const name={rainfall:"Heavy rain",flooding:"Flood",disease:"Disease"}[type];
        const label=name+(warning ? " warning" : " station")+(r ? " · "+r.value+" "+({rainfall:"mm",flooding:"m",disease:"counts/mL"}[type])+(type==="disease" ? ", "+r.mosquitoes+" mosquitoes/trap-day":"") : " · awaiting data");
        L.circleMarker(station(z,type),{radius:warning?11:6,color:warning?"#b43225":"#416478",fillOpacity:0.85}).bindTooltip(label,{permanent:!!warning}).addTo(map);
      }
    });
    assets.forEach((a) => {
      const marker = L.marker([a.latitude, a.longitude], {
        title: a.name,
        alt: a.name,
        icon: L.divIcon({
          className: "pin " + a.type,
          html: renderToStaticMarkup(<KindIcon kind={a.type} size={15} />),
          iconSize: [29, 29],
          iconAnchor: [14, 24],
        }),
      }).addTo(map);
      const label = document.createElement("span");
      label.textContent = a.name;
      marker.bindTooltip(label);
      marker.on("click", () => go("/assets/" + a.id));
    });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [assets, s]);
  return (
    <div
      className="leafmap"
      ref={el}
      aria-label="Interactive community asset map"
    />
  );
}
