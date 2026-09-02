import React from "react";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface ReviewPageProps extends SidebarProps {}

const ReviewPage: React.FC<ReviewPageProps> = (props) => {
  const { onNewVerification, onLogout } = props;

  return (
    <div className="dashboard-layout">
      <Sidebar {...props} />

      <div className="dashboard-main">
        <Topbar title="Secondary Review" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <h1>Secondary Review</h1>
              <p>Cases flagged for elevated-risk secondary officer review</p>
            </div>

            <button className="primary-button" type="button" onClick={onNewVerification}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Document Verification
            </button>
          </section>

          <div className="stats-grid">
            <div className="stat-card orange">
              <div className="stat-label">Pending Review</div>
              <div className="stat-value">0</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">High Priority</div>
              <div className="stat-value">0</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Reviewed Today</div>
              <div className="stat-value">0</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Total Reviewed</div>
              <div className="stat-value">0</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Flagged Cases Awaiting Review</span>
            </div>

            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div className="empty-state-title">No cases pending review</div>
              <div className="empty-state-text">
                Cases flagged as medium or high risk will appear here for secondary officer review.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewPage;
