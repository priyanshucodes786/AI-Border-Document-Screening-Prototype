import React from "react";
import Sidebar, { SidebarProps } from "../shared/Sidebar";
import Topbar from "../shared/Topbar";

interface SettingsPageProps extends SidebarProps {}

const SettingsPage: React.FC<SettingsPageProps> = (props) => {
  const { officerName, officerId, onLogout } = props;

  const initials = officerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="dashboard-layout">
      <Sidebar {...props} />

      <div className="dashboard-main">
        <Topbar title="Settings" onLogout={onLogout} />

        <main className="dashboard-content">
          <section className="dashboard-heading">
            <div>
              <h1>Settings</h1>
              <p>System configuration and officer profile settings</p>
            </div>
          </section>

          <div className="settings-grid">
            {/* OFFICER PROFILE */}
            <div className="panel settings-panel">
              <div className="panel-header">
                <span>Officer Profile</span>
              </div>
              <div className="settings-body">
                <div className="settings-avatar-row">
                  <div className="settings-avatar">{initials}</div>
                  <div>
                    <strong className="settings-officer-name">{officerName}</strong>
                    <span className="settings-officer-id">Officer ID: {officerId}</span>
                  </div>
                </div>

                <div className="settings-field">
                  <label className="form-label">Display Name</label>
                  <input className="form-input" type="text" defaultValue={officerName} readOnly />
                </div>

                <div className="settings-field">
                  <label className="form-label">Officer ID</label>
                  <input className="form-input" type="text" defaultValue={officerId} readOnly />
                </div>

                <div className="settings-field">
                  <label className="form-label">Role</label>
                  <input className="form-input" type="text" defaultValue="Border Screening Officer" readOnly />
                </div>
              </div>
            </div>

            {/* SYSTEM SETTINGS */}
            <div className="panel settings-panel">
              <div className="panel-header">
                <span>System Configuration</span>
              </div>
              <div className="settings-body">
                <div className="settings-toggle-row">
                  <div>
                    <strong>Auto-save screening results</strong>
                    <p>Save all results to the case database automatically.</p>
                  </div>
                  <div className="toggle-switch toggle-on"></div>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <strong>High-risk alerts</strong>
                    <p>Show visual and audio alert for high-risk documents.</p>
                  </div>
                  <div className="toggle-switch toggle-on"></div>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <strong>Require secondary review</strong>
                    <p>Mandate secondary review for all risk scores above 70.</p>
                  </div>
                  <div className="toggle-switch toggle-off"></div>
                </div>

                <div className="settings-field">
                  <label className="form-label">Backend API URL</label>
                  <input className="form-input" type="text" defaultValue="http://localhost:8000" readOnly />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
