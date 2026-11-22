import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Zone } from "../../domain/types";

/** Click inside the outlined zone to place the asset pin. */
export function PinPicker(props: { bounds: Zone["bounds"]; latitude: number; longitude: number; onPick: (lat: number, lng: number) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const initial = useRef(props);
  useEffect(() => {
    const { bounds: b, latitude, longitude, onPick } = initial.current;
    const area = L.latLngBounds([b.south, b.west], [b.north, b.east]);
    const map = L.map(element.current!).fitBounds(area);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      className: "quiet-tiles",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.rectangle(area, { color: "#527B55", weight: 1.5, dashArray: "4 6", fillColor: "#A8C5A0", fillOpacity: 0.12, interactive: false }).addTo(map);
    const pin = L.circleMarker([latitude, longitude], { radius: 9, color: "#244B38", weight: 2.5, fillColor: "#A8C5A0", fillOpacity: 1 }).addTo(map);
    map.on("click", (e) => {
      if (!area.contains(e.latlng)) return;
      pin.setLatLng(e.latlng);
      onPick(e.latlng.lat, e.latlng.lng);
    });
    return () => {
      map.remove();
    };
  }, []);
  return (
    <div ref={element} className="pickmap" aria-label="Choose asset location: click inside the outlined zone" />
  );
}
