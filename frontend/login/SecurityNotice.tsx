export default function SecurityNotice() {
  return (
    <div className="security-notice">
      <div className="security-icon">
        !
      </div>

      <div>
        <strong>Security Notice:</strong>{" "}
        This system is restricted to authorized SSB personnel only.
        Unauthorized access is a security violation. All activities are
        logged and monitored.
      </div>
    </div>
  );
}