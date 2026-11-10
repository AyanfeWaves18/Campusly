import { supabase } from "./supabase.js";
import { shapeEvent } from "./events.js";

const ERRORS = {
  "cannot suspend an admin": "You can't suspend an admin.",
  "not found": "That person no longer exists.",
  "not allowed": "You don't have access to that.",
};
const friendly = (e, fallback) => ERRORS[(e?.message || "").trim()] || fallback;

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

/* ---------- People ---------- */

// A profile with its photos, even when the person has hidden it
export async function adminGetProfile(id) {
  const { data, error } = await supabase.rpc("admin_get_profile", { target: id });
  if (error) return { error: friendly(error, "We couldn't open that profile.") };

  const paths = Array.isArray(data.photos) ? data.photos : [];
  let photos = [];
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("photos").createSignedUrls(paths, 3600);
    photos = paths.map((path) => ({
      path,
      url: (signed || []).find((s) => s.path === path)?.signedUrl || "",
    }));
  }
  return { profile: data, photos };
}

export async function adminFindPeople(q) {
  const { data, error } = await supabase.rpc("admin_find_people", { q });
  if (error) return { error: "We couldn't search.", rows: [] };
  return { rows: data || [] };
}

export async function adminSetSuspended(id, doSuspend, why) {
  const { error } = await supabase.rpc("admin_set_suspended", {
    target: id,
    do_suspend: doSuspend,
    why: why || null,
  });
  if (error) return { error: friendly(error, "We couldn't do that. Please try again.") };
  return { ok: true };
}

// Removes the photo from their profile, then deletes the file itself
export async function adminRemovePhoto(id, path) {
  const { error } = await supabase.rpc("admin_remove_photo", { target: id, photo_path: path });
  if (error) return { error: friendly(error, "We couldn't remove that photo.") };
  await supabase.storage.from("photos").remove([path]);
  return { ok: true };
}

// Listening links for voice notes in a report: { path: link }
export async function adminVoiceUrls(paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (!list.length) return {};
  const { data } = await supabase.storage.from("voice").createSignedUrls(list, 3600);
  const out = {};
  (data || []).forEach((s) => {
    if (s.signedUrl) out[s.path] = s.signedUrl;
  });
  return out;
}

export async function fetchAdminLog() {
  const { data, error } = await supabase.rpc("admin_log");
  if (error) return { error: "We couldn't load the activity.", rows: [] };
  return { rows: data || [] };
}