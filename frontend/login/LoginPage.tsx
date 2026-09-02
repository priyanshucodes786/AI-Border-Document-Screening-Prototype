import { FormEvent, useState } from "react";
import SecurityNotice from "./SecurityNotice";

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!officerId.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    const success = onLogin(officerId.trim(), password);

    if (!success) {
      setError("Invalid username or password. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div className="login-shield">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
            </svg>
          </div>

          <h1>Border Document Screening System</h1>
          <p>Secure Document Verification Portal</p>
        </div>

        <div className="login-body">
          <div className="login-title">
            <h2>Officer Login</h2>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="officer-id" className="form-label">Username</label>

              <input
                id="officer-id"
                className="form-input"
                type="text"
                value={officerId}
                onChange={(event) => setOfficerId(event.target.value)}
                placeholder="Username"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>

              <div className="password-wrapper">
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setError("Please contact your system administrator.");
                }}
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="login-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-button">
              Login to System
            </button>
          </form>

          <SecurityNotice />
        </div>
      </div>
    </div>
  );
}