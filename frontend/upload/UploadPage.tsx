import { useState } from "react";
import { ShieldCheck, ScanLine, Database } from "lucide-react";
import DocumentTypeSelector from "./DocumentTypeSelector";
import FileUpload from "./FileUpload";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface Props extends SidebarProps {
  onFileSelected: (file: File, documentType: string) => void;
}

export default function UploadPage({ onFileSelected, onLogout, ...sidebarProps }: Props) {
  const [selectedType, setSelectedType] = useState("Passport");

  return (
    <div className="dashboard-layout">
      <Sidebar {...sidebarProps} onLogout={onLogout} />

      <div className="dashboard-main">
        <Topbar title="New Verification" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <div className="page-eyebrow">DOCUMENT SCREENING</div>
              <h1>Start a new verification</h1>
              <p>Upload an identity or travel document for automated screening.</p>
            </div>

            <div className="screening-mode-badge">
              <span>SCREENING MODE</span>
              <strong>STANDARD</strong>
            </div>
          </section>

          <div className="upload-layout">
            <div className="panel upload-panel">
              <DocumentTypeSelector
                value={selectedType}
                onChange={(value) => setSelectedType(value)}
              />

              <FileUpload
                onFileSelected={(file) => {
                  onFileSelected(file, selectedType);
                }}
              />
            </div>

            <div className="panel process-panel">
              <div className="panel-title-row">
                <ScanLine size={19} />
                <h3>What the system checks</h3>
              </div>

              <div className="process-item">
                <div className="process-number">01</div>
                <div>
                  <strong>OCR Extraction</strong>
                  <p>Extracts names, document numbers, dates and other visible fields.</p>
                </div>
              </div>

              <div className="process-item">
                <div className="process-number">02</div>
                <div>
                  <strong>Document Validation</strong>
                  <p>Checks document structure, formats, dates and consistency.</p>
                </div>
              </div>

              <div className="process-item">
                <div className="process-number">03</div>
                <div>
                  <strong>Tampering Detection</strong>
                  <p>Looks for suspicious alterations in text, image regions and document structure.</p>
                </div>
              </div>

              <div className="process-item">
                <div className="process-number">04</div>
                <div>
                  <strong>Face Verification</strong>
                  <p>Compares the document photograph with the presented person.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="trust-strip">
            <div>
              <ShieldCheck size={17} />
              <span>AI-assisted screening</span>
            </div>
            <div>
              <ScanLine size={17} />
              <span>Automated document analysis</span>
            </div>
            <div>
              <Database size={17} />
              <span>Structured verification output</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}