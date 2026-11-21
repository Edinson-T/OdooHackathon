import { riskLevelNames, type Risk } from "../domain/risk";

// The priority score with its level in words, so colour is not the only cue.
export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span
      className={"badge " + risk.level}
      title={risk.parts.map((p) => `${p.name} ${p.points}/${p.max}`).join(", ")}
    >
      <i />
      {risk.score} · {riskLevelNames[risk.level]}
    </span>
  );
}
