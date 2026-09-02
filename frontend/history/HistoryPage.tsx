import React from "react";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface HistoryPageProps extends SidebarProps {}

const HistoryPage: React.FC<HistoryPageProps> = (props) => {
  const { onNewVerification, onLogout } = props;

  return (
    <div className="dashboard-layout">
      <Sidebar {...props} />

      <div className="dashboard-main">
        <Topbar title="Verification History" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <h1>Verification History</h1>
              <p>Complete log of all past document screenings</p>
            </div>

            <button className="primary-button" type="button" onClick={onNewVerification}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Document Verification
            </button>
          </section>

          <div className="panel">
            <div className="panel-header">
              <span>History Log</span>
            </div>

            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="12 8 12 12 14 14"/>
                  <path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
                  <polyline points="3 3 3 11 11 11"/>
                </svg>
              </div>
              <div className="empty-state-title">No history yet</div>
              <div className="empty-state-text">
                Completed screenings will be recorded here for audit and review.
              </div>
              <button className="text-button" type="button" onClick={onNewVerification}>
                Start New Verification →
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
