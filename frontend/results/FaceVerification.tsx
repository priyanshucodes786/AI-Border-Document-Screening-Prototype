interface Props {
  data?: {
    matchScore?: number;
    status?: string;
    [key: string]: any;
  };
}

export default function FaceVerification({ data = {} }: Props) {
  const score = Number.isFinite(data?.matchScore) ? Number(data.matchScore) : 0;

  let tone: "green" | "amber" | "red" = "green";
  let label = "Genuine Face Match";
  let description = "The presented face is consistent with the document photograph.";

  if (score <= 40) {
    tone = "red";
    label = "Risky Match, Review Required";
    description = "The face similarity is below the accepted threshold and requires review.";
  } else if (score <= 75) {
    tone = "amber";
    label = "Suspected Match, Review Required";
    description = "The face similarity is borderline and should be reviewed manually.";
  }

  return (
    <div className="result-panel">
      <div className="result-panel-header">
        <div>
          <span className="result-index">04</span>
          <h3>Face Liveness</h3>
        </div>

        <span className={`result-badge ${tone === "green" ? "success" : tone === "amber" ? "warning" : "danger"}`}>
          {data.status || label}
        </span>
      </div>

      <div className={`face-match-panel face-${tone}`}>
        <div className="face-score">
          <strong>{score}</strong>
          <span>/100</span>
        </div>

        <div>
          <span className="face-match-label">{label}</span>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}