const USER_KEY = "campusly_user";
const SESSION_KEY = "campusly_session";
const P = "campusly_";

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(P + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getUser() {
  return load("user", null);
}
export function saveUser(user) {
  save("user", user);
}
export function removeUser() {
  localStorage.removeItem(USER_KEY);
}
export function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "1";
}
export function setLoggedIn(value) {
  if (value) localStorage.setItem(SESSION_KEY, "1");
  else localStorage.removeItem(SESSION_KEY);
}
export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(P))
    .forEach((k) => localStorage.removeItem(k));
}

export function blockUser(id) {
  const b = load("blocked", []);
  if (!b.includes(id)) save("blocked", [...b, id]);
}
export function unblockUser(id) {
  save("blocked", load("blocked", []).filter((x) => x !== id));
}
export function reportUser(id, reason, note) {
  save("reports", [...load("reports", []), { id, reason, note, t: Date.now() }]);
}

export function currentTheme() {
  return load("theme", "dark");
}
export function applyTheme() {
  document.documentElement.dataset.theme = currentTheme();
}
export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  save("theme", next);
  applyTheme();
  return next;
}