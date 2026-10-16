import { supabase } from "./supabase.js";
import { getUser, saveUser } from "../utils/storage.js";
import { checkImage } from "../utils/files.js";

const BUCKET = "photos";
export const MAX_PHOTOS = 4;
const URL_LIFETIME = 60 * 60; // viewing links last one hour (in seconds)
const urlCache = new Map(); // path -> { url, expires }

// Shrinks a picture to a small JPEG before uploading, to save storage and data
function shrinkToBlob(file, max = 600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

// Saves the list of photo paths on the person's profile
async function saveList(userId, list) {
  const { error } = await supabase.from("profiles").update({ photos: list }).eq("id", userId);
  return error;
}

// Uploads one photo and adds it to the profile. Returns { photos } or { error }.
export async function addPhoto(file) {
  const user = getUser();
  if (!user?.id) return { error: "You're not logged in." };

  const problem = checkImage(file);
  if (problem) return { error: problem };

  const current = user.photos || [];
  if (current.length >= MAX_PHOTOS) return { error: `You can add up to ${MAX_PHOTOS} photos.` };

  let blob;
  try {
    blob = await shrinkToBlob(file);
  } catch {
    return { error: "Couldn't read that image." };
  }

  // Photos live in a folder named after the person's account id
  const path = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
         if (uploadError) {
    console.error("Photo upload error:", uploadError);
    return { error: "We couldn't upload that photo. Please try again." };
  }

  const list = [...current, path];
  if (await saveList(user.id, list)) {
    await supabase.storage.from(BUCKET).remove([path]); // undo the upload
    return { error: "We couldn't save your photo. Please try again." };
  }

  saveUser({ ...user, photos: list });
  return { photos: list };
}

// Deletes one photo from storage and from the profile. Returns { photos } or { error }.
export async function removePhoto(path) {
  const user = getUser();
  if (!user?.id) return { error: "You're not logged in." };

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
  if (removeError) return { error: "We couldn't remove that photo. Please try again." };

  const list = (user.photos || []).filter((p) => p !== path);
  if (await saveList(user.id, list)) return { error: "We couldn't update your profile. Please try again." };

  urlCache.delete(path);
  saveUser({ ...user, photos: list });
  return { photos: list };
}

// Turns stored photo paths into temporary viewing links: { path: link }
export async function loadPhotoUrls(paths) {
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


// Deletes every photo file in the person's folder (used when they delete their account)
export async function removeAllMyPhotos() {
  const user = getUser();
  if (!user?.id) return;
  const { data, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100 });
  if (error) {
    console.error("Photo cleanup error:", error);
    return;
  }
  const paths = (data || []).map((f) => `${user.id}/${f.name}`);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) console.error("Photo cleanup error:", removeError);
  }
}