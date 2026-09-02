import React from "react";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface DashboardPageProps extends SidebarProps {
  officerName: string;
  officerId: string;
}

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  const { officerName, onNewVerification, onLogout } = props;

  return (
    <div className="dashboard-layout">
      <Sidebar {...props} />

      <div className="dashboard-main">
        <Topbar title="Screening Dashboard" onLogout={onLogout} />

        <main className="dashboard-content">
          {/* HEADING */}
          <section className="dashboard-heading">
            <div>
              <h1>Screening Dashboard</h1>
              <p>Welcome back, {officerName}</p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={onNewVerification}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Document Verification
            </button>
          </section>

          {/* STAT CARDS */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Cases</div>
              <div className="stat-value">0</div>
            </div>

            <div className="stat-card green">
              <div className="stat-label">Verified</div>
              <div className="stat-value">0</div>
            </div>

            <div className="stat-card orange">
              <div className="stat-label">Pending Review</div>
              <div className="stat-value">0</div>
            </div>

            <div className="stat-card red">
              <div className="stat-label">High Risk</div>
              <div className="stat-value">0</div>
            </div>
          </div>

          {/* RECENT CASES */}
          <div className="panel">
            <div className="panel-header">
              <span>Recent Verification Cases</span>
            </div>

            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
              </div>
              <div className="empty-state-title">No cases yet</div>
              <div className="empty-state-text">
                Start a new document verification to see it appear here.
              </div>
              <button
                className="text-button"
                type="button"
                onClick={onNewVerification}
              >
                Start New Verification →
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;