import { supabase } from "./supabase.js";

const ERRORS = {
  slow_down: "You've sent a lot of reports today. Please try again tomorrow.",
  "not allowed": "You can't do that.",
  "invalid report": "Pick a reason first.",
};

const friendly = (e) => ERRORS[(e?.message || "").trim()] || "Something went wrong. Please try again.";

export async function blockPerson(id) {
  const { error } = await supabase.rpc("block_person", { target: id });
  if (error) return { error: friendly(error) };
  return { ok: true };
}

export async function unblockPerson(id) {
  const { error } = await supabase.rpc("unblock_person", { target: id });
  if (error) return { error: friendly(error) };
  return { ok: true };
}

// People you blocked: { blocked_id, blocked_name, created_at }
export async function fetchMyBlocks() {
  const { data, error } = await supabase.rpc("my_blocks");
  if (error) return { error: "We couldn't load your blocked list.", blocks: [] };
  return { blocks: data || [] };
}

// Saves the report (with the last 10 messages between you) and can block them at the same time
export async function reportPerson(id, reason, note, alsoBlock) {
  const { error } = await supabase.rpc("report_person", {
    target: id,
    why: reason,
    details: note || null,
    also_block: !!alsoBlock,
  });
  if (error) return { error: friendly(error) };
  return { ok: true };
}