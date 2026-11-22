import { supabase } from "./supabase.js";
import { load, save } from "../utils/storage.js";

const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const WANTED = (userId) => `push_wanted_${userId}`;

// The public key comes in a text form that the browser wants as bytes
function keyToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const pushConfigured = () => !!KEY;

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iPhones only allow notifications for apps added to the Home Screen
export function needsInstallForPush() {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  return ios && !installed;
}

// The app's background helper. Gives up after a few seconds instead of waiting forever.
async function readyReg() {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);
}

// "loading" is never returned: unsupported | install | blocked | off | on
export async function getPushState() {
  if (!pushConfigured()) return "unsupported";
  if (needsInstallForPush()) return "install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted") {
    const reg = await readyReg();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? "on" : "off";
  }
  return "off";
}

async function saveSub(sub) {
  const j = sub.toJSON();
  if (!j?.endpoint || !j?.keys?.p256dh || !j?.keys?.auth) return { error: "bad-subscription" };
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_ua: (navigator.userAgent || "").slice(0, 200),
  });
  return error ? { error: "save" } : {};
}

async function subscribeNow(reg) {
  const options = { userVisibleOnly: true, applicationServerKey: keyToBytes(KEY) };
  try {
    return await reg.pushManager.subscribe(options);
  } catch (e) {
    // An old subscription made with a different key blocks a new one, so clear it and try once more
    const old = await reg.pushManager.getSubscription();
    if (old) await old.unsubscribe();
    return reg.pushManager.subscribe(options);
  }
}

// Ask permission, subscribe this device, and tell the server
export async function enablePush(userId) {
  if (!pushConfigured() || !pushSupported()) return { error: "unsupported" };
  const perm = await Notification.requestPermission();
  if (perm === "denied") return { error: "blocked" };
  if (perm !== "granted") return { error: "dismissed" };
  const reg = await readyReg();
  if (!reg) return { error: "not-ready" };
  try {
    const sub = (await reg.pushManager.getSubscription()) || (await subscribeNow(reg));
    const saved = await saveSub(sub);
    if (saved.error) return saved;
  } catch (e) {
    return { error: "failed" };
  }
  if (userId) save(WANTED(userId), true);
  return {};
}

export async function disablePush(userId) {
  const reg = await readyReg();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  if (userId) save(WANTED(userId), false);
  return {};
}

// When someone logs out, this phone must stop getting their notifications
let watching = false;
export function watchSignOut() {
  if (watching) return;
  watching = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_OUT") return;
    readyReg()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => (sub ? sub.unsubscribe() : null))
      .catch(() => {});
  });
}

// Run when the app opens: keeps this phone connected for people who turned notifications on
export async function syncPush(userId) {
  watchSignOut();
  if (!userId || !pushConfigured() || !pushSupported()) return;
  if (!load(WANTED(userId), false)) return;
  if (Notification.permission !== "granted") {
    save(WANTED(userId), false);
    return;
  }
  try {
    const reg = await readyReg();
    if (!reg) return;
    const sub = (await reg.pushManager.getSubscription()) || (await subscribeNow(reg));
    await saveSub(sub);
  } catch (e) {
    // Try again next time the app opens
  }
}

export const wantsPush = (userId) => !!userId && load(WANTED(userId), false);

export async function fetchPushPrefs() {
  const { data, error } = await supabase.rpc("my_push_prefs");
  if (error || !data?.[0]) return { likes: true, messages: true, compliments: true, events: true };
  return data[0];
}

export async function setPushPref(key, on) {
  const { error } = await supabase.rpc("set_push_pref", { p_key: key, p_on: !!on });
  return error ? { error: "save" } : {};
}

export async function sendTestPush() {
  const { error } = await supabase.rpc("send_test_push");
  return error ? { error: "test" } : {};
}