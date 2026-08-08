import { useState } from "react";
import { fetchInvestigation } from "../api";
import MarkdownContent from "./MarkdownContent";

const TABS = [
  { id: "logs", label: "CloudWatch Logs", icon: "📋" },
  { id: "health", label: "Service Health", icon: "💚" },
  { id: "runbook", label: "Runbook", icon: "📖" },
  { id: "sns", label: "SNS Escalation", icon: "🚨" },
];

export default function InvestigationPanel({
  serviceName,
  investigation,
  onInvestigationUpdate,
  onReportToAgent,
  agentLoading,
}) {
  const [tab, setTab] = useState("logs");
  const [refreshing, setRefreshing] = useState(false);

  if (!serviceName) {
    return (
      <div className="investigation-panel empty">
        <p>Select a service or trigger an incident to view tool outputs.</p>
      </div>
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchInvestigation(serviceName);
      onInvestigationUpdate(data);
    } finally {
      setRefreshing(false);
    }
  };

  const tools = investigation?.tools;
  const svc = investigation?.service;

  return (
    <div className="investigation-panel">
      <div className="inv-header">
        <div>
          <h3>Investigation — {svc?.displayName ?? serviceName}</h3>
          <p className="inv-sub">
            {investigation?.scenario?.label ?? "Live tool data — same sources the agent uses"}
          </p>
        </div>
        <div className="inv-actions">
          <button type="button" className="btn-sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {svc?.status !== "healthy" && (
            <button
              type="button"
              className="btn-sm btn-report"
              disabled={agentLoading}
              onClick={() => onReportToAgent(serviceName, investigation)}
            >
              Report to Agent
            </button>
          )}
        </div>
      </div>

      <div className="inv-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`inv-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="inv-body">
        {tab === "logs" && (
          <ToolSection
            title="CloudWatch Logs"
            status={tools?.cloudwatchLogs?.success ? "ok" : "warn"}
            summary={tools?.cloudwatchLogs?.summary}
          >
            {tools?.cloudwatchLogs?.events?.length ? (
              <ul className="log-list">
                {tools.cloudwatchLogs.events.map((e, i) => (
                  <li key={i}>
                    <time>{e.timestamp.slice(11, 19)}</time>
                    <code>{e.message}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-hint">{tools?.cloudwatchLogs?.raw ?? "No logs loaded"}</p>
            )}
          </ToolSection>
        )}

        {tab === "health" && (
          <ToolSection
            title="Service Health"
            status={tools?.serviceHealth?.success ? "ok" : "warn"}
            summary={`Status: ${tools?.serviceHealth?.status ?? "unknown"}`}
          >
            <pre className="tool-pre">{tools?.serviceHealth?.raw}</pre>
            {tools?.serviceHealth?.alarms?.length > 0 && (
              <ul className="alarm-list">
                {tools.serviceHealth.alarms.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </ToolSection>
        )}

        {tab === "runbook" && (
          <ToolSection
            title="Runbook Lookup"
            status={tools?.runbook?.success ? "ok" : "warn"}
            summary={tools?.runbook?.matchedName ?? "No match"}
          >
            {tools?.runbook?.content ? (
              <MarkdownContent content={tools.runbook.content} />
            ) : (
              <p className="empty-hint">{tools?.runbook?.raw}</p>
            )}
          </ToolSection>
        )}

        {tab === "sns" && (
          <ToolSection
            title="SNS Escalation"
            status={
              tools?.sns?.status === "sent"
                ? "ok"
                : tools?.sns?.configured
                  ? "pending"
                  : "warn"
            }
            summary={tools?.sns?.summary}
          >
            <dl className="sns-dl">
              <dt>Topic configured</dt>
              <dd>{tools?.sns?.configured ? "Yes" : "No"}</dd>
              <dt>Topic ARN</dt>
              <dd className="mono">{tools?.sns?.topicArn ?? "—"}</dd>
              <dt>Escalation sent</dt>
              <dd>{tools?.sns?.status === "sent" ? "Yes ✓" : "Not yet"}</dd>
              {tools?.sns?.lastEscalation && (
                <>
                  <dt>Last severity</dt>
                  <dd>{tools.sns.lastEscalation.severity}</dd>
                  <dt>Message ID</dt>
                  <dd className="mono">{tools.sns.lastEscalation.messageId ?? "—"}</dd>
                  <dt>Sent at</dt>
                  <dd>{tools.sns.lastEscalation.sentAt}</dd>
                  <dt>Summary</dt>
                  <dd>{tools.sns.lastEscalation.summary}</dd>
                </>
              )}
            </dl>
            <p className="sns-note">
              Agent will call <strong>escalate_incident</strong> for HIGH/CRITICAL incidents.
              Refresh after agent responds to see updated SNS status.
            </p>
          </ToolSection>
        )}
      </div>
    </div>
  );
}

function ToolSection({ title, status, summary, children }) {
  return (
    <div className="tool-section">
      <div className="tool-section-head">
        <span className={`tool-status ${status}`} />
        <strong>{title}</strong>
        <span className="tool-summary">{summary}</span>
      </div>
      {children}
    </div>
  );
}
