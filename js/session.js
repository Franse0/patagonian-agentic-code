// js/session.js
const SESSION_KEY = 'batallaNaval_session';

export function saveSession(roomId, playerKey, playerId, playerName) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerKey, playerId, playerName }));
  } catch (_) {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.roomId && s.playerKey && s.playerId) return s;
    return null;
  } catch (_) { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}
