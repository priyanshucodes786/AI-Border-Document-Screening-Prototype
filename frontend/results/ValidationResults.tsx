interface Props {
  data?: {
    riskScore?: number;
    documentFormat?: boolean;
    checksum?: boolean;
    expiry?: boolean;
    fieldConsistency?: boolean;
    verificationSummary?: string;
    [key: string]: any;
  };
}

export default function ValidationResults({ data = {} }: Props) {
  const score = Number.isFinite(data?.riskScore) ? Number(data.riskScore) : 0;
  const tone = score < 40 ? "green" : score <= 75 ? "amber" : "red";
  const label = score < 40 ? "High validation confidence" : score <= 75 ? "Moderate validation review" : "Validation failed";

  return (
    <div className="result-panel">
      <div className="result-panel-header">
        <div>
          <span className="result-index">02</span>
          <h3>Validation</h3>
        </div>

        <span className={`result-badge ${tone === "green" ? "success" : tone === "amber" ? "warning" : "danger"}`}>
          {label}
        </span>
      </div>

      <div className={`module-score-row module-${tone}`}>
        <div className="module-score-value">{score}<small>/100</small></div>
        <div className="module-score-copy">
          <span>Validation module score</span>
          <strong>{score < 40 ? "Green — format, checksum, and required fields are valid" : score <= 75 ? "Amber — some checks are weak or incomplete" : "Red — validation issues detected"}</strong>
        </div>
      </div>

      <div className="validation-list">
        <div>
          <span>Document format</span>
          <span className={`check-status ${data.documentFormat === false ? "fail" : "pass"}`}>
            {data.documentFormat === false ? "FLAG" : "PASS"}
          </span>
        </div>

        <div>
          <span>Checksum / document number</span>
          <span className={`check-status ${data.checksum === false ? "fail" : "pass"}`}>
            {data.checksum === false ? "FLAG" : "PASS"}
          </span>
        </div>

        <div>
          <span>Expiry validity</span>
          <span className={`check-status ${data.expiry === false ? "fail" : "pass"}`}>
            {data.expiry === false ? "FLAG" : "PASS"}
          </span>
        </div>

        <div>
          <span>Field consistency</span>
          <span className={`check-status ${data.fieldConsistency === false ? "fail" : "pass"}`}>
            {data.fieldConsistency === false ? "FLAG" : "PASS"}
          </span>
        </div>
      </div>
    </div>
  );
}