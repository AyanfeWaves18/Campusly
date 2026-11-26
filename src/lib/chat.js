import { supabase } from "./supabase.js";
import { getUser } from "../utils/storage.js";

// The database answers with short words. These turn them into friendly sentences.
const ERRORS = {
  like_first: "Like this person before you message them.",
  like_back: "Like them back to reply.",
  limit: "You've used your free messages. They need to like you back to keep chatting.",
  slow_down: "You're sending messages too fast. Wait a moment and try again.",
  "invalid message": "Type a message first. Messages can be up to 500 characters.",
  "not allowed": "You can't message this person.",
};

function friendly(error) {
  const text = (error?.message || "").trim();
  return ERRORS[text] || "We couldn't send your message. Please try again.";
}

// Where a chat stands: matched | open | limit_wait | limit_like | like_first | closed
export async function fetchChatState(partnerId) {
  const { data, error } = await supabase.rpc("chat_state", { partner: partnerId });
  if (error) return { error: "We couldn't load this chat." };
  const row = Array.isArray(data) ? data[0] : data;
  return { state: row?.state || "closed", remaining: row?.remaining ?? null };
}

// True when the database itself said no (limit reached, not allowed...). Anything else, like a
// dropped connection, is worth trying again later.
function refused(error) {
  const text = (error?.message || "").trim();
  return !!ERRORS[text] || error?.code === "P0001";
}

export async function sendMessage(partnerId, text, replyId = null) {
  const args = { target: partnerId, content: text };
  if (replyId) args.p_reply = replyId;
  const { data, error } = await supabase.rpc("send_message", args);
  if (error) {
    return { error: friendly(error), code: (error.message || "").trim(), retry: !refused(error) };
  }
  return { message: Array.isArray(data) ? data[0] : data };
}

// ---------- Messages waiting for a connection ----------
// With no internet, a message is kept on this phone and sent by itself when the connection is back.
const MAX_WAITING = 20;
const outboxListeners = new Set();

function outboxKey() {
  const me = getUser()?.id;
  return me ? `campusly_outbox_${me}` : null;
}
function readOutbox() {
  const key = outboxKey();
  if (!key) return [];
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeOutbox(list) {
  const key = outboxKey();
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
function tellOutbox(event) {
  outboxListeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* one listener failing must not stop the others */
    }
  });
}
function dropFromOutbox(tmpId) {
  writeOutbox(readOutbox().filter((m) => m.tmpId !== tmpId));
}

// The messages to one person that are still waiting: { tmpId, to, text, ts, replyId }
export function waitingMessages(partnerId) {
  return readOutbox().filter((m) => m.to === partnerId);
}

// Calls fn when the waiting list changes, a waiting message gets sent, or one is refused.
// Events: { type: "queued" } | { type: "sent", partnerId, message } | { type: "failed", partnerId, error }
export function subscribeToOutbox(fn) {
  outboxListeners.add(fn);
  return () => outboxListeners.delete(fn);
}

function queueMessage(partnerId, text, replyId = null) {
  const list = readOutbox();
  if (list.filter((m) => m.to === partnerId).length >= MAX_WAITING) {
    return { error: "Too many messages are waiting. Connect to the internet first." };
  }
  const item = {
    tmpId: `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    to: partnerId,
    text,
    ts: Date.now(),
    replyId: replyId || null,
  };
  if (!writeOutbox([...list, item])) return { error: "We couldn't send your message. Please try again." };
  tellOutbox({ type: "queued" });
  return { queued: item };
}

// Sends the message. If there is no connection, it waits on the phone and goes out later.
// Returns { message } when sent, { queued } when waiting, or { error }.
export async function sendOrQueue(partnerId, text, replyId = null) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return queueMessage(partnerId, text, replyId);
  const res = await sendMessage(partnerId, text, replyId);
  if (res.retry) return queueMessage(partnerId, text, replyId);
  return res;
}

let flushing = false;

// Sends the waiting messages, oldest first. Stops as soon as the connection fails again.
export async function flushOutbox() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (!getUser()?.id) return;
  flushing = true;
  try {
    const refusedFor = new Set(); // people who said no this round, so their other messages are dropped too
    for (const item of readOutbox()) {
      if (refusedFor.has(item.to)) {
        dropFromOutbox(item.tmpId);
        continue;
      }
      const res = await sendMessage(item.to, item.text, item.replyId);
      if (res.error) {
        if (res.retry) break; // still no connection, try again later
        refusedFor.add(item.to);
        dropFromOutbox(item.tmpId);
        tellOutbox({ type: "failed", partnerId: item.to, error: res.error });
        continue;
      }
      dropFromOutbox(item.tmpId);
      tellOutbox({ type: "sent", partnerId: item.to, message: res.message });
    }
  } finally {
    flushing = false;
  }
}

// Starts by itself: when the connection comes back, when the app is opened again, and every 15 seconds
if (typeof window !== "undefined") {
  window.addEventListener("online", () => flushOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushOutbox();
  });
  setInterval(() => {
    if (readOutbox().length) flushOutbox();
  }, 15000);
  setTimeout(() => flushOutbox(), 2000);
}

// Every message between you and one person, oldest first
export async function fetchMessages(partnerId) {
  const me = getUser()?.id;
  if (!me) return { messages: [] };
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at, audio_path, audio_seconds, invite_id, reply_to")
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${me})`
    )
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { error: "We couldn't load your messages." };
  return { messages: data || [] };
}

// Marks what this person sent you as seen
export async function markRead(partnerId) {
  const { error } = await supabase.rpc("mark_read", { partner: partnerId });
  return { ok: !error };
}

// Calls onMessage the moment the other person sends you something. Returns a stop function.
export function subscribeToChat(partnerId, onMessage) {
  const me = getUser()?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`chat-${partnerId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
      (payload) => {
        if (payload.new?.sender_id === partnerId) onMessage(payload.new);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Calls onRead when the other person sees one of your messages
export function subscribeToReads(partnerId, onRead) {
  const me = getUser()?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`reads-${partnerId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${me}` },
      (payload) => {
        if (payload.new?.recipient_id === partnerId) onRead(payload.new);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// "Is typing" and "is recording" signals. Nothing is saved: they go straight between the two phones.
// onActivity gets "typing", "recording", or null (they stopped).
export function openTypingChannel(partnerId, onActivity) {
  const me = getUser()?.id;
  if (!me) return { send() {}, close() {} };
  const key = [me, partnerId].sort().join("_");
  const channel = supabase.channel(`typing-${key}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "typing" }, ({ payload }) => {
    if (payload?.from !== partnerId) return;
    onActivity(payload.kind || (payload.typing === false ? null : "typing"));
  });
  channel.subscribe();
  let last = 0;
  return {
    // kind: "typing", "recording", or false to say "stopped"
    send(kind = "typing") {
      const now = Date.now();
      if (kind && now - last < 1500) return;
      last = now;
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { from: me, kind: kind || null, typing: !!kind },
      });
    },
    close() {
      supabase.removeChannel(channel);
    },
  };
}

// Calls onChange whenever anyone sends you a message (used to refresh the inbox)
export function subscribeToInbox(onChange) {
  const me = getUser()?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`inbox-${me}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Your chats: the latest message with each person (matches with no messages included)
export async function fetchConversations() {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) return { error: "We couldn't load your chats.", chats: [] };
  return { chats: data || [] };
}

// Likes where nobody has chatted yet
export async function fetchRequests() {
  const { data, error } = await supabase.rpc("my_requests");
  if (error) return { error: "We couldn't load your requests.", requests: [] };
  return { requests: data || [] };
}

// "Not now": set a like aside. The other person is not told.
export async function passPerson(id) {
  const { error } = await supabase.rpc("pass_person", { target: id });
  if (error) return { error: "We couldn't do that. Please try again." };
  return { ok: true };
}

// People who sent you messages you haven't opened: { partner_id, unread }
export async function fetchUnread() {
  const { data, error } = await supabase.rpc("my_unread");
  if (error) return { error: "We couldn't load unread messages.", rows: [] };
  return { rows: data || [] };
}

// Calls onChange when a message arrives for you, or when messages are marked as read
export function subscribeToUnread(onChange) {
  const me = getUser()?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`unread-${me}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}