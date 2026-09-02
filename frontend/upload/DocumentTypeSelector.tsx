interface Props {
  value: string;
  onChange: (value: string) => void;
}

const documentTypes = [
  "Passport",
  "Aadhar Card",
];

export default function DocumentTypeSelector({
  value,
  onChange,
}: Props) {
  return (
    <div className="field-group">
      <label>Document Type</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="document-select"
      >
        {documentTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}