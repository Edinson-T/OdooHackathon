import { activeEvents, alertTitle, byUrgency } from "../../domain/warnings";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { KindIcon, go } from "../../components/ui";
import { useApp } from "../../app/provider";
import type { Asset, HazardType } from "../../domain/types";
// Short names for the labels on the zones, where room is tight.
const chipNames: Record<HazardType, string> = {
  rainfall: "Rain",
  heat: "Heat",
  dengue: "Dengue",
};
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
    const land = L.imageOverlay(
      "./landscape.png",
      [
        [50.82, 4.1],
        [50.94, 4.7],
      ],
      { attribution: "Green Assets · illustrated zone map" },
    ).addTo(map);
    const street = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        className: "quiet-tiles",
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    );
    street.once("tileerror", () => {
      map.removeLayer(street);
      land.addTo(map);
    });
    L.control
      .layers(
        { "Field map": land, "Street map": street },
        {},
        { position: "topright" },
      )
      .addTo(map);
    const active = activeEvents(s);
    s.zones.forEach((z) => {
      const here = active.filter((e) => e.zoneId === z.id).sort(byUrgency);
      const b = z.bounds;
      // A zone with any alert gets one red frame and a light wash. Which
      // alerts it has is said by the labels on the zone, one per alert.
      L.rectangle(
        [
          [b.south, b.west],
          [b.north, b.east],
        ],
        here.length
          ? {
              color: "#c0503a",
              weight: 4,
              fillColor: "#c0503a",
              fillOpacity: 0.07,
              interactive: false,
            }
          : {
              color: "#527B55",
              weight: 1,
              dashArray: "4 7",
              fillColor: "#A8C5A0",
              fillOpacity: 0.08,
              interactive: false,
            },
      ).addTo(map);
      const chips = here.map(
        (e) =>
          `<span class="zone-chip ${e.type}" title="${alertTitle(e.type)}">${chipNames[e.type]}</span>`,
      );
      if (chips.length)
        L.marker([b.north - 0.0045, (b.west + b.east) / 2], {
          icon: L.divIcon({
            className: "zone-alerts",
            html: chips.join(""),
            iconSize: [440, 18],
            iconAnchor: [220, 9],
          }),
          interactive: false,
        }).addTo(map);
      L.marker([b.north - 0.001, (b.west + b.east) / 2], {
        icon: L.divIcon({
          className: "zone-label",
          html: z.name.toUpperCase(),
          iconSize: [140, 16],
          iconAnchor: [70, 8],
        }),
        interactive: false,
      }).addTo(map);
    });
    assets.forEach((a) => {
      const marker = L.marker([a.latitude, a.longitude], {
        title: a.name,
        alt: a.name,
        icon: L.divIcon({
          className: "pin " + a.type + " c-" + a.condition,
          html: renderToStaticMarkup(<KindIcon kind={a.type} size={13} />),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
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
