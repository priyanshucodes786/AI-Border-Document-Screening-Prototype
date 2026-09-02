import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileImage, UploadCloud } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function FileUpload({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload JPG, PNG, WEBP or PDF.");
      return;
    }

    onFileSelected(file);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div
      className={`upload-zone ${dragging ? "upload-zone-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={handleInput}
        hidden
      />

      <div className="upload-icon">
        <UploadCloud size={32} />
      </div>

      <h3>Upload document</h3>

      <p>
        Drag and drop the document here, or click to browse
      </p>

      <div className="upload-formats">
        <span>
          <FileImage size={15} />
          JPG / PNG / WEBP / PDF
        </span>

        <span>Maximum 10 MB</span>
      </div>
    </div>
  );
}