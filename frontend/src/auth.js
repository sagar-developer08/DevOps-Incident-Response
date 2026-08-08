const AUTH_KEY = "devops_incident_auth";
const DEMO_USER = "sagar-test";
const DEMO_PASSWORD = "Sagar@123";

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function login(username, password) {
  if (username === DEMO_USER && password === DEMO_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "true");
    sessionStorage.setItem("devops_incident_user", username);
    return { ok: true };
  }
  return { ok: false, error: "Invalid username or password." };
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem("devops_incident_user");
}

export function getUsername() {
  return sessionStorage.getItem("devops_incident_user") || DEMO_USER;
}
