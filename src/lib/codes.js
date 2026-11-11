import { supabase } from "./supabase.js";

// Turns whatever someone types into the code format: ABCD-1234
export function normCode(s) {
  const raw = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

// Is this code valid right now? The database only answers yes or no.
export async function checkInvite(code) {
  const c = normCode(code);
  if (c.length !== 9) return false;
  const { data, error } = await supabase.rpc("check_invite", { c });
  return !error && data === true;
}