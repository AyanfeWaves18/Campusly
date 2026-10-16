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

export async function sendMessage(partnerId, text) {
  const { data, error } = await supabase.rpc("send_message", { target: partnerId, content: text });
  if (error) return { error: friendly(error), code: (error.message || "").trim() };
  return { message: Array.isArray(data) ? data[0] : data };
}

// Every message between you and one person, oldest first
export async function fetchMessages(partnerId) {
  const me = getUser()?.id;
  if (!me) return { messages: [] };
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at, audio_path, audio_seconds")
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