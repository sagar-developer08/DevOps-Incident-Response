import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage, createSession, checkHealth, fetchInvestigation } from "./api";
import { isAuthenticated, logout, getUsername } from "./auth.js";
import ChatMessage from "./components/ChatMessage";
import IncidentForm from "./components/IncidentForm";
import ServiceDashboard from "./components/ServiceDashboard";
import InvestigationPanel from "./components/InvestigationPanel";
import LoginPage from "./components/LoginPage.jsx";

const QUICK_EXAMPLES = [
  "Payment API returning 503 errors in production since 10 AM",
  "Cart service high latency — add-to-cart taking 3+ seconds",
  "Order service failing — orders stuck in PENDING",
];

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [activeService, setActiveService] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!authed) return;
    createSession().then(setSessionId).catch(console.error);
    checkHealth().then(setHealth).catch(() => setHealth({ status: "unknown" }));
  }, [authed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInvestigation = useCallback(async (serviceName) => {
    if (!serviceName) return;
    try {
      const data = await fetchInvestigation(serviceName);
      setInvestigation(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSelectService = useCallback(
    (name) => {
      setActiveService(name);
      loadInvestigation(name);
    },
    [loadInvestigation]
  );

  const handleSend = async (text, options = {}) => {
    if (!text.trim() || loading || sendingRef.current) return;

    sendingRef.current = true;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text, ts: Date.now() }]);
    setLoading(true);

    try {
      const result = await sendMessage(text, sessionId, {
        serviceName: options.serviceName ?? activeService,
        investigation: options.investigation ?? investigation,
      });
      if (result.sessionId && result.sessionId !== sessionId) setSessionId(result.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.message, ts: Date.now() },
      ]);
      if (result.investigation) setInvestigation(result.investigation);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}`, ts: Date.now(), isError: true },
      ]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const handleReportToAgent = async (serviceName, inv) => {
    setActiveService(serviceName);
    let snapshot = inv;
    if (!snapshot || snapshot.service?.name !== serviceName) {
      try {
        snapshot = await fetchInvestigation(serviceName);
        setInvestigation(snapshot);
      } catch (err) {
        console.error(err);
      }
    }
    const prompt =
      snapshot?.scenario?.suggestedPrompt ??
      `${serviceName} service is ${snapshot?.service?.status ?? "unhealthy"} in production. Please investigate using the tool evidence.`;
    handleSend(prompt, { serviceName, investigation: snapshot });
  };

  const handleNewSession = async () => {
    setSessionId(await createSession());
    setMessages([]);
    setError(null);
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setMessages([]);
    setSessionId(null);
    setHealth(null);
    setActiveService(null);
    setInvestigation(null);
    setError(null);
  };

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">🛡️</div>
          <div>
            <h1>DevOps Incident Response</h1>
            <p className="subtitle">Strands Agent · CloudWatch · SNS · Runbooks</p>
          </div>
        </div>
        <div className="header-right">
          <span className="user-badge">{getUsername()}</span>
          {health && (
            <span className={`status-badge ${health.status}`}>{health.status}</span>
          )}
          <button type="button" className="btn-secondary" onClick={handleNewSession} disabled={loading}>
            New Incident
          </button>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main layout-three">
        <aside className="panel-left">
          <ServiceDashboard
            activeService={activeService}
            onSelectService={handleSelectService}
            onInvestigationUpdate={setInvestigation}
            onReportToAgent={handleReportToAgent}
            disabled={loading}
          />

          <div className="sidebar-section">
            <h3>Quick Examples</h3>
            <div className="examples">
              {QUICK_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="example-btn"
                  onClick={() => handleSend(ex)}
                  disabled={loading}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel-center">
          <InvestigationPanel
            serviceName={activeService}
            investigation={investigation}
            onInvestigationUpdate={setInvestigation}
            onReportToAgent={handleReportToAgent}
            agentLoading={loading}
          />
        </section>

        <section className="chat-area">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <h2>Incident Triage</h2>
                <p>
                  1. Trigger an incident on a service (Payment / Cart / Order)<br />
                  2. Review <strong>Logs · Health · Runbook · SNS</strong> in the center panel<br />
                  3. Click <strong>Report to Agent</strong> — agent analyzes the same evidence
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="typing-indicator">
                <span /><span /><span />
                Agent analyzing tool evidence…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <IncidentForm onSend={(t) => handleSend(t)} loading={loading} error={error} />
        </section>
      </main>
    </div>
  );
}
