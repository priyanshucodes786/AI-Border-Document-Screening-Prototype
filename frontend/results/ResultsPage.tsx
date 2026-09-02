import { RotateCcw } from "lucide-react";
import { ScreeningResult } from "../App";
import OCRResults from "./OCRResults";
import ValidationResults from "./ValidationResults";
import TamperingResults from "./TamperingResults";
import FaceVerification from "./FaceVerification";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface Props extends SidebarProps {
  result: ScreeningResult;
  onNewScreening?: () => void;
}

export default function ResultsPage({
  result,
  onNewScreening,
  onLogout,
  ...sidebarProps
}: Props) {
  return (
    <div className="dashboard-layout">
      <Sidebar {...sidebarProps} onLogout={onLogout} />

      <div className="dashboard-main">
        <Topbar title="Screening Results" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <div className="page-eyebrow">SCREENING COMPLETE</div>
              <h1>Verification results</h1>
              <p>AI-assisted analysis has been completed across all four screening modules.</p>
            </div>

            <button className="secondary-button" onClick={onNewScreening ?? (() => undefined)}>
              <RotateCcw size={17} />
              New Screening
            </button>
          </section>

          <div className="results-stack">
            <OCRResults data={result.ocr} />
            <ValidationResults data={result.validation} />
            <TamperingResults data={result.tampering} />
            <FaceVerification data={result.face} />
          </div>
        </main>
      </div>
    </div>
  );
}