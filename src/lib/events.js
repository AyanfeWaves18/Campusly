import { supabase } from "./supabase.js";

// Turns a database row into the shape the Events screens and the calendar buttons already use
export function shapeEvent(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    start: new Date(row.starts_at).getTime(),
    where: row.place,
    desc: row.description || "",
    uni: row.uni,
  };
}

// Upcoming events on a campus, soonest first
export async function fetchEvents(uni) {
  let q = supabase
    .from("events")
    .select("*")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);
  if (uni) q = q.eq("uni", uni);
  const { data, error } = await q;
  if (error) return { error: "We couldn't load events.", events: [] };
  return { events: (data || []).map(shapeEvent) };
}

// The events you marked "I'm going"
export async function fetchGoingIds() {
  const { data, error } = await supabase.from("event_going").select("event_id");
  if (error) return { error: "We couldn't load your plans.", ids: [] };
  return { ids: (data || []).map((r) => r.event_id) };
}

export async function setGoing(id, going) {
  const { error } = await supabase.rpc("set_going", { ev: id, going });
  if (error) return { error: "We couldn't save that. Please try again." };
  return { ok: true };
}

// Upcoming events you are going to (for your profile and the reminders)
export async function fetchMyGoingEvents() {
  const g = await fetchGoingIds();
  if (g.error) return { error: g.error, events: [] };
  if (!g.ids.length) return { events: [] };
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", g.ids)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) return { error: "We couldn't load your events.", events: [] };
  return { events: (data || []).map(shapeEvent) };
}