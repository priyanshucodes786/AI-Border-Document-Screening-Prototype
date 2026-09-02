interface Props {
  data?: Record<string, any>;
}

const formatLabel = (key: string) => {
  if (key === "documentNumber") return "Document Number";

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
};

export default function OCRResults({ data = {} }: Props) {
  const score = Number.isFinite(data?.riskScore) ? Number(data.riskScore) : 0;
  const tone = score < 40 ? "green" : score <= 75 ? "amber" : "red";
  const label = score < 40 ? "Good extraction" : score <= 75 ? "Moderate extraction" : "Poor extraction";

  const fields = Object.entries(data).filter(([key, value]) => {
    if (["rawText", "lines", "components", "riskScore", "score", "confidence", "matchScore", "status", "source"].includes(key)) {
      return false;
    }

    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "object") return false;

    return true;
  });

  return (
    <div className="result-panel">
      <div className="result-panel-header">
        <div>
          <span className="result-index">01</span>
          <h3>OCR Extraction</h3>
        </div>

        <span className={`result-badge ${tone === "green" ? "success" : tone === "amber" ? "warning" : "danger"}`}>
          {label}
        </span>
      </div>

      <div className={`module-score-row module-${tone}`}>
        <div className="module-score-value">{score}<small>/100</small></div>
        <div className="module-score-copy">
          <span>OCR module score</span>
          <strong>{score < 40 ? "Green — sufficient extracted content" : score <= 75 ? "Amber — partial extraction needs review" : "Red — weak extraction, requires review"}</strong>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="data-grid">
          <div>
            <span>Result</span>
            <strong>No OCR fields were extracted for this document.</strong>
          </div>
        </div>
      ) : (
        <div className="data-grid">
          {fields.map(([key, value]) => (
            <div key={key}>
              <span>{formatLabel(key)}</span>
              <strong>{String(value)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}