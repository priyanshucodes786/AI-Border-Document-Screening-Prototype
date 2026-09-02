import { useEffect, useState } from "react";
import { ArrowLeft, FileCheck, FileText } from "lucide-react";
import ImageViewer from "./ImageViewer";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface Props extends SidebarProps {
  file: File;
  documentType: string;
  onBack: () => void;
  onAnalyze: () => void;
  isLoading: boolean;
  error: string;
}

export default function DocumentPreview({
  file,
  documentType,
  onBack,
  onAnalyze,
  isLoading,
  error,
  onLogout,
  ...sidebarProps
}: Props) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isImage = file.type.startsWith("image/");

  return (
    <div className="dashboard-layout">
      <Sidebar {...sidebarProps} onLogout={onLogout} />

      <div className="dashboard-main">
        <Topbar title="Document Preview" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <div className="page-eyebrow">DOCUMENT PREVIEW</div>
              <h1>Review before screening</h1>
              <p>Confirm that the uploaded document is clear and suitable for analysis.</p>
            </div>
          </section>

          <div className="preview-layout">
            {/* IMAGE PANEL */}
            <div className="panel preview-panel">
              {isImage ? (
                <ImageViewer src={previewUrl} alt="Uploaded document" />
              ) : (
                <div className="pdf-placeholder">
                  <FileText size={46} />
                  <strong>PDF document</strong>
                  <span>{file.name}</span>
                </div>
              )}
            </div>

            {/* INFO PANEL */}
            <div className="panel document-info-panel">
              <div className="panel-title-row">
                <FileCheck size={19} />
                <h3>Document details</h3>
              </div>

              <div className="info-row">
                <span>Document type</span>
                <strong>{documentType}</strong>
              </div>

              <div className="info-row">
                <span>File name</span>
                <strong>{file.name}</strong>
              </div>

              <div className="info-row">
                <span>File size</span>
                <strong>{(file.size / 1024 / 1024).toFixed(2)} MB</strong>
              </div>

              <div className="info-row">
                <span>Format</span>
                <strong>{file.type || "Unknown"}</strong>
              </div>

              <div className="preview-note">
                <strong>Before continuing</strong>
                <p>
                  Make sure the document is fully visible, not heavily blurred,
                  and contains enough detail for OCR and forensic analysis.
                </p>
              </div>

              {error && (
                <div className="analyze-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="button-row">
                <button className="secondary-button" onClick={onBack} disabled={isLoading}>
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  className="primary-button"
                  onClick={onAnalyze}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing…
                    </>
                  ) : (
                    "Start AI Screening"
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}