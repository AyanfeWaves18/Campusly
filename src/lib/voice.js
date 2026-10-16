import { supabase } from "./supabase.js";
import { getUser } from "../utils/storage.js";

const BUCKET = "voice";
const URL_LIFETIME = 60 * 60; // listening links last one hour (in seconds)
const urlCache = new Map(); // path -> { url, expires }

const ERRORS = {
  like_first: "Like this person before you message them.",
  like_back: "Like them back to reply.",
  limit: "You've used your free messages. They need to like you back to keep chatting.",
  slow_down: "You're sending messages too fast. Wait a moment and try again.",
  "invalid message": "We couldn't send that voice note. Please try again.",
  "not allowed": "You can't message this person.",
};

// Uploads the recording, then sends it as a message. If sending fails, the file is removed again.
export async function sendVoiceNote(partnerId, blob, seconds, mime) {
  const user = getUser();
  if (!user?.id) return { error: "You're not logged in." };

  const type = (mime || blob.type || "audio/webm").split(";")[0];
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: type, upsert: false });
  if (uploadError) {
    console.error("Voice upload error:", uploadError);
    return { error: "We couldn't upload your voice note. Please try again." };
  }

  const { data, error } = await supabase.rpc("send_voice", {
    target: partnerId,
    file_path: path,
    secs: seconds,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    const code = (error.message || "").trim();
    return { error: ERRORS[code] || "We couldn't send your voice note. Please try again.", code };
  }
  return { message: Array.isArray(data) ? data[0] : data };
}

// Turns stored file paths into temporary listening links: { path: link }
export async function loadVoiceUrls(paths) {
  const now = Date.now();
  const out = {};
  const missing = [];

  for (const p of paths || []) {
    const hit = urlCache.get(p);
    if (hit && hit.expires > now) out[p] = hit.url;
    else missing.push(p);
  }

  if (missing.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, URL_LIFETIME);
    for (const item of data || []) {
      if (item.signedUrl) {
        out[item.path] = item.signedUrl;
        urlCache.set(item.path, { url: item.signedUrl, expires: now + (URL_LIFETIME - 600) * 1000 });
      }
    }
  }
  return out;
}

// Deletes every voice file in your folder (used when you delete your account)
export async function removeAllMyVoiceNotes() {
  const user = getUser();
  if (!user?.id) return;
  const { data, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: 1000 });
  if (error) {
    console.error("Voice cleanup error:", error);
    return;
  }
  const paths = (data || []).map((f) => `${user.id}/${f.name}`);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) console.error("Voice cleanup error:", removeError);
  }
}