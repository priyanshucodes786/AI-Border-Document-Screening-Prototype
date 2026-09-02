interface Props {
  score: number;
}

export default function RiskScore({ score }: Props) {
  const numericScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Number(score))) : 0;

  let tone: "low" | "medium" | "high" = "low";
  let title = "Genuine Document";
  let description = "The document matches the expected screening threshold and requires no additional review.";

  if (numericScore > 75) {
    tone = "high";
    title = "Risky Document, Review Required";
    description = "Multiple screening signals indicate elevated risk. Secondary review is required before clearance.";
  } else if (numericScore > 40) {
    tone = "medium";
    title = "Suspected Document, Review Required";
    description = "The document shows risk indicators that require manual review before a final decision.";
  }

  return (
    <div className={`risk-panel risk-${tone}`}>
      <div>
        <span className="eyebrow">DOCUMENT RISK SCORE</span>

        <div className="risk-score">
          {numericScore}
          <small>/100</small>
        </div>

        <strong>{title}</strong>
      </div>

      <div className="risk-explanation">
        <h3>Assessment</h3>

        <p>{description}</p>

        <div className="risk-scale">
          <span>&lt; 40 — Genuine</span>
          <span>40–75 — Suspected</span>
          <span>&gt; 75 — Risky</span>
        </div>
      </div>
    </div>
  );
}