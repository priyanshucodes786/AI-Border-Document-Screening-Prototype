import React from "react";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface ReportsPageProps extends SidebarProps {}

const ReportsPage: React.FC<ReportsPageProps> = (props) => {
  const { onLogout } = props;

  const reportTypes = [
    {
      title: "Daily Screening Summary",
      description: "Overview of all screenings conducted today including pass/fail breakdown.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18"/>
          <path d="M9 21V9"/>
        </svg>
      ),
      color: "blue",
    },
    {
      title: "High Risk Case Report",
      description: "All cases that exceeded risk threshold requiring secondary review.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      color: "red",
    },
    {
      title: "Tampering Detection Log",
      description: "Documents flagged for potential tampering and forensic irregularities.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      color: "orange",
    },
    {
      title: "Officer Activity Report",
      description: "Breakdown of verifications processed per officer for the selected period.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
      color: "green",
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar {...props} />

      <div className="dashboard-main">
        <Topbar title="Reports" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <h1>Reports</h1>
              <p>Generate and export screening reports for audit and compliance</p>
            </div>
          </section>

          <div className="reports-grid">
            {reportTypes.map((report) => (
              <div key={report.title} className={`report-card report-card-${report.color}`}>
                <div className="report-card-icon">{report.icon}</div>
                <div className="report-card-body">
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                </div>
                <button className="report-generate-btn" type="button">
                  Generate Report
                </button>
              </div>
            ))}
          </div>

          <div className="panel" style={{ marginTop: "22px" }}>
            <div className="panel-header">
              <span>Recent Reports</span>
            </div>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="empty-state-title">No reports generated yet</div>
              <div className="empty-state-text">
                Generated reports will be listed here for download and review.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
