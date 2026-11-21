import { hazardConfig } from "../../domain/hazardConfig";
import type { RainDay } from "../../domain/scenario";

// Rain by day for the simulated scenario: solid bars for what fell, hatched
// bars for the forecast. A later day is a button that moves the scenario there.
export function RainStrip({
  days,
  today,
  zoneNames,
  onJump,
}: {
  days: RainDay[];
  today: number;
  zoneNames: string[];
  onJump?: (day: number) => void;
}) {
  const limit = hazardConfig.rainfall.warning;
  const top = Math.max(limit * 2, ...days.map((d) => d.rain));
  return (
    <figure className="rainstrip">
      <figcaption>
        Rain by day, averaged over the zones. Hatched bars are the simulated
        forecast.{onJump && " Select a later day to move the scenario there."}
      </figcaption>
      <div className="rainbars">
        <span className="rainlimit" style={{ bottom: (limit / top) * 100 + "%" }}>
          {limit} mm warning threshold
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
    </figure>
  );
}
