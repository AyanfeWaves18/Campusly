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

/* ---------- Account registry ----------
   Every account ever created is kept here, even after the user deletes it,
   so you can count total registrations. In the real app this lives in the database. */

// Phone numbers are compared by their last 10 digits (0801... and +234801... match)
export const phoneKey = (p = "") => String(p).replace(/\D/g, "").slice(-10);
export const emailKey = (e = "") => String(e).trim().toLowerCase();

export function getRegistry() {
  return load("registry", []);
}

// An active (not deleted) account that already uses this email or phone
export function findActiveAccount(email, phone, exceptId = null) {
  const e = emailKey(email);
  const p = phoneKey(phone);
  return getRegistry().find(
    (r) => !r.deletedAt && r.id !== exceptId && ((e && r.email === e) || (p && r.phone === p))
  );
}

export function addToRegistry(user) {
  const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  save("registry", [
    ...getRegistry(),
    {
      id,
      email: emailKey(user.email),
      phone: phoneKey(user.phone),
      uni: user.uni || "",
      method: user.google ? "google" : "email",
      createdAt: Date.now(),
      deletedAt: null,
    },
  ]);
  return id;
}

// Accounts created before the registry existed get a record the next time they log in
export function ensureRegistered(user) {
  if (!user || user.accountId) return user;
  const accountId = addToRegistry(user);
  const updated = { ...user, accountId };
  saveUser(updated);
  return updated;
}

export function updateRegistry(id, { email, phone }) {
  save(
    "registry",
    getRegistry().map((r) => (r.id === id ? { ...r, email: emailKey(email), phone: phoneKey(phone) } : r))
  );
}

export function registrationStats() {
  const reg = getRegistry();
  return {
    total: reg.length,
    active: reg.filter((r) => !r.deletedAt).length,
    deleted: reg.filter((r) => r.deletedAt).length,
  };
}

// Deletes everything the user can see, but keeps the registry record (marked as deleted)
export function deleteMyAccount(user) {
  const next = getRegistry().map((r) =>
    r.id === user?.accountId && !r.deletedAt ? { ...r, deletedAt: Date.now() } : r
  );
  const keep = ["registry", "theme", "cookie_ok"];
  Object.keys(localStorage)
    .filter((k) => k.startsWith(P) && !keep.includes(k.slice(P.length)))
    .forEach((k) => localStorage.removeItem(k));
  save("registry", next);
}