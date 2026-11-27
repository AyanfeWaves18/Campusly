import { getUser } from "../utils/storage.js";

// Unsent text, kept on this phone so it is still there when you come back to the chat.
// Names look like "chat:<person id>" or "group:<group id>".
const MAX_DRAFTS = 50;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // forgotten after 30 days

function storeKey() {
  const me = getUser()?.id;
  return me ? `campusly_drafts_${me}` : null;
}

function read() {
  const key = storeKey();
  if (!key) return {};
  try {
    const map = JSON.parse(localStorage.getItem(key) || "{}");
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  } catch {
    return {};
  }
}

function write(map) {
  const key = storeKey();
  if (!key) return;
  try {
    if (Object.keys(map).length) localStorage.setItem(key, JSON.stringify(map));
    else localStorage.removeItem(key);
  } catch {
    /* storage full or blocked: drafts just won't be kept */
  }
}

export function getDraft(name) {
  const d = read()[name];
  if (!d || typeof d.text !== "string" || !d.text.trim()) return "";
  if (Date.now() - Number(d.ts || 0) > MAX_AGE) return "";
  return d.text;
}

// Saves what you have typed. An empty box removes the draft.
export function setDraft(name, text) {
  const map = read();
  if (!text || !text.trim()) {
    if (name in map) {
      delete map[name];
      write(map);
    }
    return;
  }
  map[name] = { text, ts: Date.now() };
  const names = Object.keys(map);
  if (names.length > MAX_DRAFTS) {
    names
      .sort((a, b) => Number(map[a]?.ts || 0) - Number(map[b]?.ts || 0))
      .slice(0, names.length - MAX_DRAFTS)
      .forEach((n) => delete map[n]);
  }
  write(map);
}

export function clearDraft(name) {
  setDraft(name, "");
}

// The draft as one short line for the chat list, or "" when there is none
export function draftPreview(name) {
  return getDraft(name).replace(/\s+/g, " ").trim().slice(0, 120);
}