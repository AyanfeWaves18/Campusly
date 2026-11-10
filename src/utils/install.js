// Remembers the browser's "install" offer, so a button can use it later.
// The browser makes the offer once, early, so this file must load when the app starts.
let deferred = null;
const listeners = new Set();
const tell = () => listeners.forEach((f) => f());

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  tell();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  tell();
});

export const canPrompt = () => deferred !== null;

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Opens the browser's own install box. Returns "accepted", "dismissed" or "unavailable".
export async function promptInstall() {
  if (!deferred) return "unavailable";
  const e = deferred;
  deferred = null;
  tell();
  e.prompt();
  const choice = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
  return choice.outcome;
}

// True when Campusly is already running as an installed app
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);