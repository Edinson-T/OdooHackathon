import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { KindIcon } from "../../components/ui";
import type { Asset, Zone } from "../../domain/types";
import { addBaseLayers } from "./baseLayers";

/** A small map beside an asset's details, so anyone can see where it is. */
export function MiniMap({ asset, zone }: { asset: Asset; zone?: Zone }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false, zoomControl: false, zoomSnap: 0.1 });
    // Centred on the asset, close enough to see its surroundings on the field map.
    map.setView([asset.latitude, asset.longitude], 12.5);
    L.control.zoom({ position: "topright" }).addTo(map);
    addBaseLayers(map);
    if (zone) {
      const b = zone.bounds;
      L.rectangle(
        [
          [b.south, b.west],
          [b.north, b.east],
        ],
        { color: "#527B55", weight: 1.5, dashArray: "4 6", fillColor: "#A8C5A0", fillOpacity: 0.1, interactive: false },
      ).addTo(map);
    }
    L.marker([asset.latitude, asset.longitude], {
      title: asset.name,
      alt: asset.name,
      keyboard: false,
      icon: L.divIcon({
        className: "pin big " + asset.type + " c-" + asset.condition,
        html: renderToStaticMarkup(<KindIcon kind={asset.type} size={15} />),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    }).addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [asset.latitude, asset.longitude, asset.type, asset.condition, asset.name, zone]);
  return (
    <figure className="minimap">
      <div ref={el} className="minimapcanvas" aria-label={"Map showing where " + asset.name + " is"} />
      <figcaption>
        <span>{zone?.name}</span>
        <a href={"https://www.openstreetmap.org/?mlat=" + asset.latitude + "&mlon=" + asset.longitude + "#map=17/" + asset.latitude + "/" + asset.longitude} target="_blank" rel="noreferrer">
          Open in OpenStreetMap
        </a>
      </figcaption>
    </figure>
  );
}
