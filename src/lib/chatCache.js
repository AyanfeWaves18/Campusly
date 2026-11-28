import { getUser } from "../utils/storage.js";

// A small copy of each chat you open, so it still opens with no internet.
// Only the last messages are kept, and it is wiped when you log out or delete your account.
const PREFIX = "campusly_cc_";
const KEEP = 40;

function keyFor(partnerId) {
  const me = getUser()?.id;
  return me ? `${PREFIX}${me}_${partnerId}` : null;
}

export function saveChatCache(partnerId, { person, messages, state, remaining }) {
  const key = keyFor(partnerId);
  if (!key || !person) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        at: Date.now(),
        person: { id: person.id, name: person.name, verified: !!person.verified, gone: !!person.gone, photoUrls: [] },
        state: state || "closed",
        remaining: remaining ?? null,
        messages: (messages || []).slice(-KEEP),
      })
    );
  } catch {
    // storage full or blocked: the chat just won't open offline
  }
}

export function loadChatCache(partnerId) {
  const key = keyFor(partnerId);
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return saved && saved.person ? saved : null;
  } catch {
    return null;
  }
}

export function clearChatCaches() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nothing to clear
  }
}

// Someone who isn't signed in never keeps saved chats
try {
  if (typeof window !== "undefined" && !getUser()?.id) clearChatCaches();
} catch {
  // ignore
}