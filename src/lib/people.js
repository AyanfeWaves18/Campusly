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

// People you are allowed to see. The database decides who that is
// (same campus, and not hidden), so this only asks for the list.
export async function fetchPeople(myId) {
  if (!myId) return { people: [] };
  const { data, error } = await supabase
    .from("profiles")
    .select(FIELDS)
    .neq("id", myId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: "We couldn't load people. Pull down to try again." };
  return { people: await withFirstPhotos((data || []).map(shape)) };
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