import { supabase } from "./supabase.js";

// The database answers with short words. These turn them into friendly sentences.
const ERRORS = {
  group_limit: "You can have up to 3 groups. Delete one to make another.",
  too_many_groups: "You're in 30 groups already. Leave one first.",
  group_full: "This group is full.",
  banned: "You can't join this group.",
  "not found": "We couldn't find that group. Check the link or code.",
  "not allowed": "You can't do that right now. Finish your profile first, or check your account.",
  "invalid name": "The name needs 2 to 50 characters. The description can be up to 160.",
  "invalid message": "Type a message first. Messages can be up to 500 characters.",
  slow_down: "You're sending messages too fast. Wait a moment and try again.",
  invalid: "Please check what you typed and try again.",
};

function friendly(error) {
  const text = (error?.message || "").trim();
  return ERRORS[text] || "Something went wrong. Check your internet and try again.";
}

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { error: friendly(error) };
  return { data };
}
const first = (data) => (Array.isArray(data) ? data[0] : data) || null;

// Groups you are in, newest activity first
export async function fetchMyGroups() {
  const r = await call("my_groups");
  return r.error ? { error: "We couldn't load your groups.", groups: [] } : { groups: r.data || [] };
}

// Public groups you are not in. Search is by name.
export async function discoverGroups(query = "") {
  const r = await call("discover_groups", { p_query: query || null, p_limit: 30, p_offset: 0 });
  return r.error ? { error: "We couldn't load groups.", groups: [] } : { groups: r.data || [] };
}

// What a link or code leads to
export async function previewGroup(code) {
  const r = await call("group_preview", { p_code: code });
  return r.error ? { error: r.error } : { group: first(r.data) };
}

export async function createGroup(name, description, isPublic) {
  const r = await call("create_group", { p_name: name, p_description: description, p_public: isPublic });
  return r.error ? { error: r.error } : { id: r.data };
}

// Join a public group by id, or any group by code
export async function joinGroup({ id = null, code = null }) {
  const r = await call("join_group", { p_group: id, p_code: code });
  return r.error ? { error: r.error } : { id: r.data };
}

export async function leaveGroup(id) {
  const r = await call("leave_group", { p_group: id });
  return r.error ? { error: r.error } : { ok: true };
}

export async function deleteGroup(id) {
  const r = await call("delete_group", { p_group: id });
  return r.error ? { error: r.error } : { ok: true };
}

export async function updateGroup(id, { name, description, isPublic }) {
  const r = await call("update_group", { p_group: id, p_name: name, p_description: description, p_public: isPublic });
  return r.error ? { error: r.error } : { ok: true };
}

export async function resetGroupCode(id) {
  const r = await call("reset_group_code", { p_group: id });
  return r.error ? { error: r.error } : { code: r.data };
}

export async function removeGroupMember(id, userId) {
  const r = await call("remove_group_member", { p_group: id, p_user: userId });
  return r.error ? { error: r.error } : { ok: true };
}

export async function fetchGroupInfo(id) {
  const r = await call("group_info", { p_group: id });
  return r.error ? { error: r.error } : { group: first(r.data) };
}

export async function fetchGroupMembers(id) {
  const r = await call("group_members_list", { p_group: id });
  return r.error ? { error: "We couldn't load the members.", members: [] } : { members: r.data || [] };
}

// The latest messages, oldest first
export async function fetchGroupMessages(id) {
  const r = await call("group_messages_list", { p_group: id, p_before: null, p_limit: 100 });
  return r.error ? { error: "We couldn't load the messages." } : { messages: r.data || [] };
}

export async function sendGroupMessage(id, text) {
  const r = await call("send_group_message", { p_group: id, p_body: text });
  return r.error ? { error: r.error } : { message: first(r.data) };
}

export async function markGroupRead(id) {
  await call("mark_group_read", { p_group: id });
}

export async function reportGroup(id, reason) {
  const r = await call("report_group", { p_group: id, p_reason: reason });
  return r.error ? { error: r.error } : { ok: true };
}

// Calls onInsert when anyone writes in the group. Returns a stop function.
export function subscribeToGroup(id, onInsert) {
  const channel = supabase
    .channel(`group-${id}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${id}` },
      () => onInsert()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}


// "Is typing" signals for a group. Nothing is saved: they go straight between the phones.
// onChange gets the people typing right now: [{ id, name }]
export function openGroupTyping(groupId, me, onChange) {
  if (!me?.id) return { send() {}, close() {} };
  const firstName = String(me.name || "Someone").trim().split(/\s+/)[0].slice(0, 30) || "Someone";
  const channel = supabase.channel(`group-typing-${groupId}`, { config: { broadcast: { self: false } } });
  const typers = new Map(); // person id -> { name, timer }

  const emit = () => onChange([...typers].map(([id, t]) => ({ id, name: t.name })));
  const drop = (id) => {
    const t = typers.get(id);
    if (!t) return;
    clearTimeout(t.timer);
    typers.delete(id);
    emit();
  };

  channel.on("broadcast", { event: "typing" }, ({ payload }) => {
    const from = payload?.from;
    if (!from || from === me.id) return;
    if (!payload.typing) {
      drop(from);
      return;
    }
    const old = typers.get(from);
    if (old) clearTimeout(old.timer);
    // If the signal stops coming (closed tab, lost signal), clear it after a moment
    typers.set(from, {
      name: String(payload.name || "Someone").slice(0, 40),
      timer: setTimeout(() => drop(from), 3500),
    });
    if (!old) emit();
  });
  channel.subscribe();

  let last = 0;
  return {
    // send() says "I'm typing". send(false) says "I stopped".
    send(on = true) {
      const now = Date.now();
      if (on) {
        if (now - last < 1500) return;
        last = now;
      }
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { from: me.id, name: firstName, typing: !!on },
      });
    },
    close() {
      typers.forEach((t) => clearTimeout(t.timer));
      typers.clear();
      supabase.removeChannel(channel);
    },
  };
}