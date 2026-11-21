import { hazardConfig } from "../../domain/hazardConfig";
import type { StripDay } from "../../domain/scenario";

// The scenario day by day. Bars are rain: solid for what fell, hatched for the
// forecast. Under each past day sit its highest temperature and a mark when
// the health feed reported dengue. A later day is a button that moves the
// scenario there.
export function RainStrip({
  days,
  today,
  zoneNames,
  onJump,
}: {
  days: StripDay[];
  today: number;
  zoneNames: string[];
  onJump?: (day: number) => void;
}) {
  const limit = hazardConfig.rainfall.warning;
  const hot = hazardConfig.heat.warning;
  const top = Math.max(limit * 2, ...days.map((d) => d.rain));
  return (
    <figure className="rainstrip">
      <figcaption>
        Rain by day, averaged over the zones. Hatched bars are the simulated
        forecast.{onJump && " Select a later day to move the scenario there."}
      </figcaption>
      <div className="rainbars">
        <span className="rainlimit" style={{ bottom: (limit / top) * 100 + "%" }}>
          {limit} mm threshold
        </span>
        {days.map((d) => {
          const label = `Day ${d.day + 1}: ${d.rain} mm${d.forecast ? " forecast" : ""}`;
          const detail = d.byZone
            .map((mm, i) => `${zoneNames[i]} ${mm} mm`)
            .join(", ");
          const css =
            "rainday" +
            (d.forecast ? " forecast" : "") +
            (d.rain > limit ? " over" : "") +
            (d.day === today ? " today" : "");
          const bar = <i style={{ height: Math.max(2, (d.rain / top) * 100) + "%" }} />;
          return d.forecast && onJump ? (
            <button
              key={d.day}
              className={css}
              title={label + ". " + detail}
              aria-label={label + ". Move the scenario to this day."}
              onClick={() => onJump(d.day)}
            >
              {bar}
            </button>
          ) : (
            <span
              key={d.day}
              className={css}
              role="img"
              title={label + ". " + detail}
              aria-label={label}
            >
              {bar}
            </span>
          );
        })}
      </div>
      <div className="raindays" aria-hidden="true">
        {days.map((d) => (
          <span key={d.day} className={d.day === today ? "today" : ""}>
            {d.day + 1}
          </span>
        ))}
      </div>
      <div className="raindays extra">
        {days.map((d) =>
          d.forecast ? (
            <span key={d.day} />
          ) : (
            <span
              key={d.day}
              className={d.temperature > hot ? "hot" : ""}
              title={`Day ${d.day + 1}: highest ${d.temperature} °C${d.dengue ? ", dengue reported" : ""}`}
            >
              {Math.round(d.temperature)}°{d.dengue && <b className="dot">D</b>}
            </span>
          ),
        )}
      </div>
    </figure>
  );
}
