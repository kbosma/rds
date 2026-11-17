// Kleine helpers voor de API van de demo-backend (profiel 'demo').

export const BASE = process.env.DEMO_BACKEND ?? 'http://localhost:8667/rds';
export const API = `${BASE}/api`;
export const DEMO = `${BASE}/demo`;

export async function login({ userName, password }) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName, password }),
  });
  if (!res.ok) throw new Error(`Inloggen als ${userName} mislukt: ${res.status} ${await res.text()}`);
  const body = await res.json();
  if (!body.token) throw new Error(`Inloggen als ${userName} gaf geen token (2FA of wachtwoord wijzigen?)`);
  return body.token;
}

export async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** De nieuwste mail in de demo-postbus (aan `to`), of null. */
export async function latestMail(to) {
  const res = await fetch(`${DEMO}/mailbox/latest?to=${encodeURIComponent(to ?? '')}`);
  return res.ok ? res.json() : null;
}

/** Zet "vandaag" in de demo op `date` (yyyy-MM-dd) en laat de statusengine rekenen. */
export async function setDemoToday(date) {
  const res = await fetch(`${DEMO}/clock?date=${date}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Demo-klok zetten mislukt: ${res.status}`);
  return res.json();
}
