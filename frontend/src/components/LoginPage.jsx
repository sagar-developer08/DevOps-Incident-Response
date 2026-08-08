import { useState } from "react";
import { login } from "../auth.js";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = login(username.trim(), password);
    if (result.ok) {
      onLogin();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">🛡️</span>
          <h1>DevOps Incident Response</h1>
          <p>Sign in to access the incident triage dashboard</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <label className="login-field">
            <span>User ID</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter user ID"
              autoComplete="username"
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
