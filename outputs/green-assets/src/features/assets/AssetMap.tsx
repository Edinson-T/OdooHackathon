import {
  activeEvents,
  alertTitle,
  byUrgency,
  currentReading,
  hazardTypes,
  station,
  stationNames,
  valueText,
} from "../../domain/warnings";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { KindIcon, go } from "../../components/ui";
import { useApp } from "../../app/provider";
import type { Asset, HazardType } from "../../domain/types";
// One colour per hazard. The level is carried by the outline and by the label
// on the zone, so the map does not depend on colour alone.
const hazardColors: Record<HazardType, string> = {
  rainfall: "#2a6f9e",
  flooding: "#1e3f7a",
  mosquito: "#a65a12",
};
// Short names for the labels on the zones, where room is tight.
const chipNames: Record<HazardType, string> = {
  rainfall: "Rain",
  flooding: "Flood",
  mosquito: "Mosquito",
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
      // One station of each kind per zone, at illustrative positions.
      for (const type of hazardTypes) {
        const reading = currentReading(s, z.id, type);
        const event = here.find((e) => e.type === type);
        const label = [
          stationNames[type],
          reading
            ? valueText(type, reading.value) + (type === "rainfall" ? " today" : "")
            : "awaiting data",
          ...(event ? [alertTitle(type, event.level)] : []),
          ...(reading?.source === "simulated" ? ["simulated"] : []),
        ].join(" · ");
        L.circleMarker(station(z, type), {
          radius: event ? (event.level === "warning" ? 11 : 8) : 6,
          color: event ? hazardColors[type] : "#416478",
          fillOpacity: 0.85,
        })
          .bindTooltip(label)
          .addTo(map);
      }
      // A watch outlines the whole zone with dashes. A warning fills it, and a
      // flood fills it darkest. When a zone has several, the first one shades it.
      const top = here[0];
      const b = z.bounds;
      L.rectangle(
        [
          [b.south, b.west],
          [b.north, b.east],
        ],
        top
          ? {
              color: hazardColors[top.type],
              weight: top.level === "warning" ? 2.5 : 1.5,
              dashArray: top.level === "warning" ? undefined : "6 6",
              fillColor: hazardColors[top.type],
              fillOpacity:
                top.level === "watch" ? 0.08 : top.type === "flooding" ? 0.45 : 0.24,
              interactive: false,
            }
          : {
              color: "#607c56",
              weight: 1,
              dashArray: "4 7",
              fillColor: "#b4cda9",
              fillOpacity: 0.08,
              interactive: false,
            },
      ).addTo(map);
      const chips = [
        ...here.map(
          (e) =>
            `<span class="zone-chip ${e.type} ${e.level}" title="${alertTitle(e.type, e.level)}">${chipNames[e.type]} ${e.level}</span>`,
        ),
        ...(s.healthNotices.includes(z.id)
          ? ['<span class="zone-chip healthnotice">Health notice</span>']
          : []),
      ];
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
