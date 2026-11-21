import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Zone } from "../../domain/types";

export function PinPicker(props: {bounds: Zone["bounds"]; latitude:number; longitude:number; onPick:(lat:number,lng:number)=>void}) {
  const element = useRef<HTMLDivElement>(null);
  const initial = useRef(props);
  useEffect(() => {
    const {bounds:b, latitude, longitude, onPick} = initial.current;
    const area = L.latLngBounds([b.south,b.west],[b.north,b.east]);
    const map = L.map(element.current!).fitBounds(area);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    const pin = L.circleMarker([latitude,longitude],{radius:8,fillOpacity:1}).addTo(map);
    map.on("click", e => {
      if (area.contains(e.latlng)) {pin.setLatLng(e.latlng); onPick(e.latlng.lat,e.latlng.lng);}
    });
    return () => {map.remove();};
  },[]);
  return <section><p>Click a location within the selected zone to place the asset pin.</p><div ref={element} style={{height:280}} aria-label="Choose asset location" /></section>;
}
