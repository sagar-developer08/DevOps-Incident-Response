const API_BASE = import.meta.env.VITE_API_URL || "";

export async function sendMessage(message, sessionId, options = {}) {
  const { serviceName, investigation } = options;
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, serviceName, investigation }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.details || data.error || "Request failed");
  return data;
}

export async function createSession() {
  const response = await fetch(`${API_BASE}/api/sessions`, { method: "POST" });
  return (await response.json()).sessionId;
}

export async function checkHealth() {
  return fetch(`${API_BASE}/health`).then((r) => r.json());
}

export async function fetchServices() {
  const response = await fetch(`${API_BASE}/api/services`);
  if (!response.ok) throw new Error("Failed to fetch services");
  return response.json();
}

export async function fetchInvestigation(serviceName) {
  const response = await fetch(`${API_BASE}/api/services/${serviceName}/investigate`);
  if (!response.ok) throw new Error("Failed to fetch investigation");
  return response.json();
}

export async function triggerIncident(serviceName, scenarioId) {
  const response = await fetch(`${API_BASE}/api/services/${serviceName}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Trigger failed");
  return data;
}

export async function recoverService(serviceName) {
  const response = await fetch(`${API_BASE}/api/services/${serviceName}/recover`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Recover failed");
  return data;
}

export async function fetchTools() {
  const response = await fetch(`${API_BASE}/api/tools`);
  return response.json();
}
