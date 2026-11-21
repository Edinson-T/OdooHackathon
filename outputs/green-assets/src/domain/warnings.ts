import type { Reading, Zone } from "./types";
export const threshold = { rainfall:25, flooding:1.5, disease:100, mosquitoes:20 };
export function exceeds(r:Reading) {
  return r.value > threshold[r.type] && (r.type !== "disease" || (r.mosquitoes ?? 0) > threshold.mosquitoes);
}
export function fieldDate(time:string) {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Brussels"}).format(new Date(time));
}
export function station(z:Zone,type:Reading["type"]):[number,number] {
  const b=z.bounds, fraction=type==="rainfall" ? 0.25 : type==="flooding" ? 0.5 : 0.75;
  return [(b.north+b.south)/2,b.west+(b.east-b.west)*fraction];
}
export async function todayRain(zone:Zone):Promise<Reading> {
  const [lat,lng]=station(zone,"rainfall");
  const url=new URL("https://api.open-meteo.com/v1/forecast");
  url.search=new URLSearchParams({latitude:String(lat),longitude:String(lng),hourly:"rain",timezone:"Europe/Brussels",forecast_days:"1",current:"rain"}).toString();
  const response=await fetch(url);
  if(!response.ok) throw Error("Weather service unavailable.");
  const data=await response.json();
  const hours:string[]=data.hourly.time;
  const values=hours.flatMap((h,i)=> h <= data.current.time ? [data.hourly.rain[i]] : []);
  if(!values.length || values.some(v=>typeof v!=="number" || !Number.isFinite(v))) throw Error("Incomplete rainfall readings.");
  return {zoneId:zone.id,type:"rainfall",value:values.reduce((a,b)=>a+b,0),observedAt:new Date().toISOString()};
}
