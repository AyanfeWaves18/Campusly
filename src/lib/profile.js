import { supabase } from "./supabase.js";
import { getUser, saveUser } from "../utils/storage.js";

// App field name -> database column name
const COLUMNS = {
  name: "name",
  gender: "gender",
  department: "department",
  level: "level",
  interestedIn: "interested_in",
  lookingFor: "looking_for",
  deptPrefs: "dept_prefs",
  interests: "interests",
  bio: "bio",
  prompts: "prompts",
};

// Saves profile changes to the cloud, then updates the copy kept on this device
export async function saveProfileToCloud(changes) {
  const user = getUser();
  if (!user?.id) return { error: "You're not logged in." };

  const row = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (key in changes) row[column] = changes[key];
  }
  if (typeof row.name === "string") row.name = row.name.trim();
  if (changes.privacy) {
    row.hide_all = !!changes.privacy.hideAll;
    row.hide_dept = !!changes.privacy.hideDept;
  }
  if (Object.keys(row).length === 0) return { ok: true };

  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) return { error: "We couldn't save your changes. Please try again." };

  saveUser({ ...user, ...changes, privacy: { ...user.privacy, ...changes.privacy } });
  return { ok: true };
}

// Changes the password. It checks the current password first by signing in again.
export async function changeMyPassword(currentPassword, newPassword, captchaToken) {
  const user = getUser();
  if (!user?.email) return { error: "You're not logged in." };

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
    options: { captchaToken },
  });
  if (checkError) {
    if ((checkError.message || "").toLowerCase().includes("captcha")) {
      return { error: "The security check didn't pass. Wait a moment for it to finish, then try again." };
    }
    return { error: "Your current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("different") || msg.includes("same")) {
      return { error: "Your new password must be different from the old one." };
    }
    return { error: "We couldn't change your password. Please try again." };
  }
  return { ok: true };
}