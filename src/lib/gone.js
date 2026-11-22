import { supabase } from "./supabase.js";

// Of these chat partners, which ones have deleted their account?
export async function fetchGonePartners(ids) {
  if (!ids?.length) return new Set();
  const { data, error } = await supabase.rpc("gone_partners", { p_ids: ids });
  if (error || !Array.isArray(data)) return new Set();
  return new Set(data);
}