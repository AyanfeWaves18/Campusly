import { supabase } from "./supabase.js";
import { saveUser, setLoggedIn } from "../utils/storage.js";

// Turns the signed-in Supabase account into the user object the rest of the app already uses
export async function syncUser() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session) return null;
  const uid = session.user.id;

  const [profileRes, privateRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("private_info").select("phone").eq("id", uid).maybeSingle(),
  ]);
  const p = profileRes.data;
  if (!p) return null;

  const user = {
    id: uid,
    name: p.name,
    uni: p.uni,
    gender: p.gender,
    department: p.department,
    level: p.level,
    interestedIn: p.interested_in,
    lookingFor: p.looking_for,
    deptPrefs: p.dept_prefs,
    interests: p.interests,
    bio: p.bio,
    prompts: p.prompts,
    photos: p.photos,
    verified: !!session.user.email_confirmed_at,
    privacy: { hideAll: p.hide_all, hideDept: p.hide_dept },
    email: session.user.email,
    phone: privateRes.data?.phone || "",
  };
  saveUser(user);
  setLoggedIn(true);
  return user;
}

export async function signUpUser(form, uni) {
  const email = form.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: form.password,
    options: {
      emailRedirectTo: `${window.location.origin}/feed`,
      data: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        uni,
        gender: form.gender,
        department: form.department,
        level: form.level,
        interested_in: form.interestedIn,
        looking_for: form.lookingFor,
        dept_prefs: form.deptPrefs,
        interests: form.interests,
        bio: form.bio,
      },
    },
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (error.status === 429 || msg.includes("rate limit")) {
      return { error: "Too many attempts. Please wait a while and try again." };
    }
    // The database refuses a second account with the same phone number
    if (msg.includes("database error")) {
      return { error: "An account with this phone number already exists. Log in instead.", field: "phone" };
    }
    if (msg.includes("already")) {
      return { error: "An account with this email already exists. Log in instead.", field: "email" };
    }
    return { error: "We couldn't create your account. Please try again." };
  }

  // Supabase hides whether an email is already registered; an empty identities list means it is
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Log in instead.", field: "email" };
  }

  // With "Confirm email" switched off, Supabase signs the person in right away
  if (data.session) {
    const user = await syncUser();
    return { user: data.user, signedIn: !!user };
  }
  return { user: data.user };
}

export async function signInUser(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("not confirmed")) {
      return { error: "Please confirm your email first. Open the link we sent you." };
    }
    if (error.status === 429) return { error: "Too many attempts. Please wait a while and try again." };
    return { error: "That email or password is incorrect." };
  }
  const user = await syncUser();
  if (!user) return { error: "We couldn't load your profile. Please try again." };
  return { user };
}


// Sends the person to Google. They come back to /feed, already signed in.
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/feed`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) return { error: "We couldn't start Google sign-in. Please try again." };
  return { ok: true };
}

// Saves the "Finish your profile" form (new Google accounts only)
export async function completeMyProfile(f) {
  const { error } = await supabase.rpc("complete_profile", {
    p_name: f.name,
    p_uni: f.uni,
    p_phone: f.phone,
    p_gender: f.gender,
    p_department: f.department,
    p_level: f.level,
    p_interested_in: f.interestedIn,
    p_looking_for: f.lookingFor,
    p_dept_prefs: f.deptPrefs,
    p_interests: f.interests,
    p_bio: f.bio || null,
  });

  if (error) {
    const msg = (error.message || "").trim();
    if (error.code === "23505") {
      return { error: "An account with this phone number already exists.", field: "phone" };
    }
    if (msg === "invalid phone") return { error: "Enter a valid phone number.", field: "phone" };
    if (msg === "invalid campus") return { error: "Choose your university." };
    if (msg !== "already complete") {
      return { error: "We couldn't save your profile. Please try again." };
    }
  }
  const user = await syncUser();
  return user ? { user } : { error: "We couldn't load your profile. Please try again." };
}