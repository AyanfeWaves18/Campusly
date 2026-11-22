import { supabase } from "./supabase.js";
import { loadPhotoUrls } from "./photos.js";

const FIELDS =
  "id, name, uni, gender, department, level, looking_for, bio, interests, prompts, photos, verified";

const cleanPaths = (photos) =>
  (photos || []).filter((p) => typeof p === "string" && !p.startsWith("data:"));

function shape(row) {
  return {
    id: row.id,
    name: row.name,
    uni: row.uni,
    gender: row.gender,
    department: row.department,
    level: row.level,
    lookingFor: row.looking_for,
    bio: row.bio,
    tags: row.interests || [],
    prompts: row.prompts || {},
    photos: cleanPaths(row.photos),
    verified: !!row.verified,
  };
}

// Adds a viewing link for each person's first photo
async function withFirstPhotos(people) {
  const firstPhotos = people.map((p) => p.photos[0]).filter(Boolean);
  const urls = firstPhotos.length ? await loadPhotoUrls(firstPhotos) : {};
  return people.map((p) => ({ ...p, photoUrl: p.photos[0] ? urls[p.photos[0]] || null : null }));
}

// People you are allowed to see. The database decides who that is (same campus, or another
// campus where you both switched Other campuses on, and never hidden or blocked people).
// scope "campus" keeps only your own university; scope "other" keeps only the others.
export async function fetchPeople(myId, myUni, scope = "campus") {
  if (!myId) return { people: [] };
  let query = supabase.from("profiles").select(FIELDS).neq("id", myId);
  if (myUni) query = scope === "other" ? query.neq("uni", myUni) : query.eq("uni", myUni);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) return { error: "We couldn't load people. Pull down to try again." };
  return { people: await withFirstPhotos((data || []).map(shape)) };
}

// Have I switched on "Other campuses"?
export async function fetchMyOpen(myId) {
  if (!myId) return false;
  const { data, error } = await supabase.rpc("my_open");
  if (error) return false;
  return !!data;
}

// Switch "Other campuses" on or off for yourself
export async function setOtherCampuses(on) {
  const { error } = await supabase.rpc("set_other_campuses", { p_on: !!on });
  if (error) return { error: "We couldn't change that. Please try again." };
  return {};
}

// One person, with all their photos. Returns { error } if they don't exist or you can't see them.
export async function fetchPerson(id) {
  const { data, error } = await supabase.from("profiles").select(FIELDS).eq("id", id).maybeSingle();
  if (error || !data) return { error: "not-found" };
  const person = shape(data);
  const urls = person.photos.length ? await loadPhotoUrls(person.photos) : {};
  return { person: { ...person, photoUrls: person.photos.map((p) => urls[p]).filter(Boolean) } };
}

// Several people at once, for the Matches page
export async function fetchPeopleByIds(ids) {
  if (!ids?.length) return { people: [] };
  const { data, error } = await supabase.from("profiles").select(FIELDS).in("id", ids);
  if (error) return { error: "We couldn't load your matches. Please try again." };
  return { people: await withFirstPhotos((data || []).map(shape)) };
}