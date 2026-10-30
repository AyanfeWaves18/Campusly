import { supabase } from "./supabase.js";

const ERRORS = {
  slow_down: "You've used your 3 compliments for today. Come back tomorrow.",
  "already sent": "You already sent them a compliment today.",
  "not allowed": "You can't send a compliment to this person.",
  invalid: "Pick a message first.",
  "invalid report": "Pick a reason first.",
};

const friendly = (e) => ERRORS[(e?.message || "").trim()] || "Something went wrong. Please try again.";

// How many you can still send today
export async function complimentsLeft() {
  const { data, error } = await supabase.rpc("compliments_left");
  return error ? null : data;
}

// Sends ready-made message number 1 to 4
export async function sendCompliment(targetId, presetNo) {
  const { data, error } = await supabase.rpc("send_compliment", { target: targetId, preset_no: presetNo });
  if (error) return { error: friendly(error) };
  return { left: data };
}

// Compliments you received: { id, preset, from_dept, created_at, seen }. It never says who sent them.
export async function fetchMyCompliments() {
  const { data, error } = await supabase.rpc("my_compliments");
  if (error) return { error: "We couldn't load your compliments.", rows: [] };
  return { rows: data || [] };
}

export async function markComplimentsSeen() {
  await supabase.rpc("mark_compliments_seen");
}

// Reports a compliment, and can block the sender, without telling you who it was
export async function reportCompliment(id, reason, alsoBlock) {
  const { error } = await supabase.rpc("report_compliment", {
    cid: id,
    why: reason,
    also_block: !!alsoBlock,
  });
  if (error) return { error: friendly(error) };
  return { ok: true };
}