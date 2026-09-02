interface Props {
  data?: {
    score?: number;
    status?: string;
    findings?: string[];
    [key: string]: any;
  };
}

export default function TamperingResults({ data = {} }: Props) {
  const score = Number.isFinite(data?.score) ? Number(data.score) : 0;
  const tone = score < 40 ? "green" : score <= 75 ? "amber" : "red";
  const label = score < 40 ? "No tampering" : score <= 75 ? "Slight tampering" : "High tampering";

  return (
    <div className="result-panel">
      <div className="result-panel-header">
        <div>
          <span className="result-index">03</span>
          <h3>Tampering</h3>
        </div>

        <span className={`result-badge ${tone === "green" ? "success" : tone === "amber" ? "warning" : "danger"}`}>
          {label}
        </span>
      </div>

      <div className={`module-score-row module-${tone}`}>
        <div className="module-score-value">{score}<small>/100</small></div>
        <div className="module-score-copy">
          <span>Tampering module score</span>
          <strong>{score < 40 ? "Green — no suspicious manipulations detected" : score <= 75 ? "Amber — moderate anomaly, manual review" : "Red — high-risk tampering indicators"}</strong>
        </div>
      </div>

      <div className="findings">
        {(data.findings || ["No strong forensic anomaly detected by the baseline checks."]).map((finding, index) => (
          <div key={index} className="finding">
            <span>•</span>
            {finding}
          </div>
        ))}
      </div>
    </div>
  );
}