import { useState, useEffect, useCallback } from "react";
import { fetchServices, triggerIncident, recoverService } from "../api";

const ICONS = { payment: "💳", cart: "🛒", order: "📦" };

export default function ServiceDashboard({
  activeService,
  onSelectService,
  onInvestigationUpdate,
  onReportToAgent,
  disabled,
}) {
  const [services, setServices] = useState([]);
  const [scenarios, setScenarios] = useState({});
  const [loading, setLoading] = useState({});
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    const data = await fetchServices();
    setServices(data.services ?? []);
    setScenarios(data.scenarios ?? {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const handleTrigger = async (name, scenarioId) => {
    setLoading((p) => ({ ...p, [name]: true }));
    try {
      const result = await triggerIncident(name, scenarioId);
      await load();
      onSelectService(name);
      if (result.investigation) onInvestigationUpdate(result.investigation);
    } finally {
      setLoading((p) => ({ ...p, [name]: false }));
      setExpanded(null);
    }
  };

  const handleRecover = async (name) => {
    setLoading((p) => ({ ...p, [name]: true }));
    try {
      await recoverService(name);
      await load();
    } finally {
      setLoading((p) => ({ ...p, [name]: false }));
    }
  };

  return (
    <div className="service-dashboard">
      <h3>Services</h3>
      <div className="service-cards">
        {services.map((svc) => {
          const busy = loading[svc.name];
          const isActive = activeService === svc.name;
          const svcScenarios = scenarios[svc.name] ?? [];

          return (
            <div
              key={svc.name}
              className={`service-card status-${svc.status} ${isActive ? "active" : ""}`}
              onClick={() => onSelectService(svc.name)}
            >
              <div className="service-card-top">
                <span>{ICONS[svc.name]}</span>
                <strong>{svc.displayName}</strong>
                <span className={`status-pill ${svc.status}`}>{svc.status}</span>
              </div>
              <div className="service-card-metrics">
                <span>{svc.latencyMs}ms</span>
                <span>{svc.errorRate}% err</span>
                <span>HTTP {svc.httpStatus}</span>
              </div>

              {svc.activeIncident && (
                <div className="active-incident-badge">
                  Active: {svc.activeIncident.replace(/-/g, " ")}
                </div>
              )}

              <div className="service-card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-sm btn-trigger"
                  disabled={busy || disabled}
                  onClick={() => setExpanded(expanded === svc.name ? null : svc.name)}
                >
                  {expanded === svc.name ? "Hide scenarios" : "Trigger incident"}
                </button>

                {svc.status !== "healthy" && (
                  <>
                    <button
                      type="button"
                      className="btn-sm btn-recover"
                      disabled={busy || disabled}
                      onClick={() => handleRecover(svc.name)}
                    >
                      Recover
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-report"
                      disabled={disabled}
                      onClick={() => onReportToAgent(svc.name)}
                    >
                      Report to Agent
                    </button>
                  </>
                )}
              </div>

              {expanded === svc.name && (
                <div className="scenario-list" onClick={(e) => e.stopPropagation()}>
                  {svcScenarios.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="scenario-btn"
                      disabled={busy || disabled}
                      onClick={() => handleTrigger(svc.name, s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
