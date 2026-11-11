import { supabase } from "./supabase.js";

// My own invite code (made the first time), and how many people joined with it
export async function fetchMyReferral() {
  const { data, error } = await supabase.rpc("my_referral");
  if (error) return { error: "We couldn't load your invite code." };
  const row = Array.isArray(data) ? data[0] : data;
  return { code: row?.code || "", joined: Number(row?.joined) || 0 };
}