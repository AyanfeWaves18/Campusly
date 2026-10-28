import { supabase } from "./supabase.js";
import { getUser } from "../utils/storage.js";

const ERRORS = {
  "not matched": "You can only invite people you've matched with.",
  "event not available": "That event has already started or isn't available.",
  "already invited": "You've already invited them to this event.",
  slow_down: "You've sent a lot of invites today. Please try again tomorrow.",
  "not allowed": "You can't do that.",
};

const friendly = (e) => ERRORS[(e?.message || "").trim()] || "Something went wrong. Please try again.";

export async function sendEventInvite(eventId, partnerId) {
  const { error } = await supabase.rpc("send_event_invite", { ev: eventId, target: partnerId });
  if (error) return { error: friendly(error) };
  return { ok: true };
}

export async function respondToInvite(inviteId, accepted) {
  const { error } = await supabase.rpc("respond_to_invite", { invite: inviteId, accepted });
  if (error) return { error: friendly(error) };
  return { ok: true };
}

// Invites between you and one person, with the event details, keyed by invite id
export async function fetchInvitesWith(partnerId) {
  const me = getUser()?.id;
  if (!me) return { invites: {} };
  const { data, error } = await supabase
    .from("event_invites")
    .select("id, event_id, inviter_id, invitee_id, status")
    .or(
      `and(inviter_id.eq.${me},invitee_id.eq.${partnerId}),and(inviter_id.eq.${partnerId},invitee_id.eq.${me})`
    );
  if (error) return { error: "We couldn't load invites.", invites: {} };

  const rows = data || [];
  if (!rows.length) return { invites: {} };

  const ids = [...new Set(rows.map((r) => r.event_id))];
  const ev = await supabase.from("events").select("id, title, starts_at, place").in("id", ids);
  const byId = new Map((ev.data || []).map((e) => [e.id, e]));

  const out = {};
  rows.forEach((r) => {
    const e = byId.get(r.event_id);
    out[r.id] = {
      id: r.id,
      status: r.status,
      inviterId: r.inviter_id,
      title: e?.title || "An event",
      start: e ? new Date(e.starts_at).getTime() : 0,
      where: e?.place || "",
    };
  });
  return { invites: out };
}

// Who you are going to events with: { eventId: ["Name", ...] }
export async function fetchCompanions() {
  const { data, error } = await supabase.rpc("my_event_companions");
  if (error) return { map: {} };
  const map = {};
  (data || []).forEach((r) => {
    const name = r.partner_name || "someone";
    map[r.event_id] = map[r.event_id] ? [...map[r.event_id], name] : [name];
  });
  return { map };
}

// Calls onChange when an invite you sent or received changes
export function subscribeToInvites(onChange) {
  const me = getUser()?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`invites-${me}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_invites", filter: `inviter_id=eq.${me}` },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_invites", filter: `invitee_id=eq.${me}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}