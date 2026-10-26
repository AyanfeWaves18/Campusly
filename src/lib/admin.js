import { supabase } from "./supabase.js";
import { shapeEvent } from "./events.js";

// The database decides who is an admin. Hiding a page is never what keeps this safe.
export async function checkAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

export async function fetchAdminStats() {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) return { error: "We couldn't load the numbers." };
  const row = Array.isArray(data) ? data[0] : data;
  return { stats: row };
}

export async function fetchAdminReports() {
  const { data, error } = await supabase.rpc("admin_reports");
  if (error) return { error: "We couldn't load reports.", reports: [] };
  return { reports: data || [] };
}

export async function setReportStatus(id, status) {
  const { error } = await supabase.rpc("admin_set_report_status", { report: id, new_status: status });
  if (error) return { error: "We couldn't update that report." };
  return { ok: true };
}

// All events on a campus, including past ones
export async function fetchAdminEvents(uni) {
  let q = supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(200);
  if (uni) q = q.eq("uni", uni);
  const { data, error } = await q;
  if (error) return { error: "We couldn't load events.", events: [] };
  return { events: (data || []).map(shapeEvent) };
}

// Adds a new event, or changes one when form.id is set
export async function saveEvent(form) {
  const title = (form.title || "").trim();
  const place = (form.place || "").trim();
  const description = (form.description || "").trim();
  const startsAt = new Date(form.startsLocal);

  if (!title || title.length > 80) return { error: "Give the event a title (up to 80 characters)." };
  if (!place || place.length > 80) return { error: "Say where it is (up to 80 characters)." };
  if (description.length > 300) return { error: "The description can be up to 300 characters." };
  if (!form.startsLocal || Number.isNaN(startsAt.getTime())) return { error: "Choose a date and time." };

  const row = {
    uni: form.uni,
    title,
    type: form.type,
    starts_at: startsAt.toISOString(),
    place,
    description: description || null,
  };

  const { error } = form.id
    ? await supabase.from("events").update(row).eq("id", form.id)
    : await supabase.from("events").insert(row);
  if (error) return { error: "We couldn't save the event. Please try again." };
  return { ok: true };
}

export async function removeEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: "We couldn't delete that event." };
  return { ok: true };
}