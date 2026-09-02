import React from "react";

interface TopbarProps {
  title: string;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ title, onLogout }) => {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-title">{title}</div>

      <div className="dashboard-topbar-actions">
        <div className="system-online">
          <span className="system-online-dot"></span>
          System Online
        </div>

        <div className="search-box-wrapper">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-box"
            type="text"
            placeholder="Search cases..."
            aria-label="Search cases"
          />
        </div>

        <button className="topbar-action" type="button" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>

        <button className="topbar-logout" type="button" onClick={onLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
