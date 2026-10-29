import { supabase } from "./supabase.js";

const toId = (x) => (typeof x === "string" ? x : Object.values(x || {})[0]);

// The ids of people you have liked
export async function fetchMyLikes() {
  const { data, error } = await supabase.from("likes").select("liked_id");
  if (error) return { error: "We couldn't load your likes.", ids: [] };
  return { ids: (data || []).map((r) => r.liked_id) };
}

// Likes someone. The database answers whether it is now a match.
export async function likePerson(id) {
  const { data, error } = await supabase.rpc("like_person", { target: id });
  if (error) return { error: "We couldn't save your like. Please try again." };
  return { match: data === true };
}

export async function unlikePerson(id) {
  const { error } = await supabase.rpc("unlike_person", { target: id });
  if (error) return { error: "We couldn't remove your like. Please try again." };
  return { ok: true };
}

// The ids of people you have matched with (you liked them and they liked you)
export async function fetchMyMatchIds() {
  const { data, error } = await supabase.rpc("my_matches");
  if (error) return { error: "We couldn't load your matches.", ids: [] };
  return { ids: (data || []).map(toId) };
}

// People who liked you and are waiting for your answer: { person_id, liked_at, msg_count, last_msg }
export async function fetchLikedMe() {
  const { data, error } = await supabase.rpc("liked_me");
  if (error) return { error: "We couldn't load the people who liked you.", rows: [] };
  return { rows: data || [] };
}