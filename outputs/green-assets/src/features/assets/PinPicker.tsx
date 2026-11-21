import { useEffect, useRef } from "react";
import L from "leaflet";

export function PinPicker(props: {latitude:number; longitude:number; onPick:(lat:number,lng:number)=>void}) {
  const element = useRef<HTMLDivElement>(null);
  const initial = useRef(props);
  useEffect(() => {
    const {latitude, longitude, onPick} = initial.current;
    const map = L.map(element.current!).setView([latitude, longitude], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    const pin = L.circleMarker([latitude,longitude],{radius:8,fillOpacity:1}).addTo(map);
    map.on("click", e => {
      const location = e.latlng.wrap();
      pin.setLatLng(location);
      onPick(location.lat, location.lng);
    });
    return () => {map.remove();};
  },[]);
  return <section><p>Click a location on the map to place the asset pin.</p><div ref={element} style={{height:280}} aria-label="Choose asset location" /></section>;
}
