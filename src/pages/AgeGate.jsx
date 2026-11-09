import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../lib/supabase.js";
import { confirmAdult, syncUser } from "../lib/auth.js";
import { removeAllMyPhotos } from "../lib/photos.js";
import { removeAllMyVoiceNotes } from "../lib/voice.js";
import { applyTheme, deleteMyAccount, getUser, setLoggedIn } from "../utils/storage.js";
import "./Auth.css";

export default function AgeGate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [agree, setAgree] = useState(false);
  const [under, setUnder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Only signed-in people who haven't confirmed yet belong here
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/login", { replace: true });
        return;
      }
      const user = await syncUser();
      if (cancelled) return;
      if (user?.adult) {
        navigate("/feed", { replace: true });
        return;
      }
      if (user && !user.department) {
        navigate("/welcome", { replace: true });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function confirm() {
    if (!agree) {
      setError("Please tick the box to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await confirmAdult();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate("/feed", { replace: true });
  }

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    navigate("/login", { replace: true });
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "Delete your account?\n\nYour profile, photos, and messages will be removed."
    );
    if (!ok) return;
    setBusy(true);
    const user = getUser();
    await removeAllMyPhotos();
    await removeAllMyVoiceNotes();
    const { error: err } = await supabase.rpc("delete_my_account");
    if (err) {
      setBusy(false);
      toast("Couldn't delete your account. Please try again.", "err");
      return;
    }
    await supabase.auth.signOut({ scope: "local" });
    deleteMyAccount(user);
    applyTheme();
    navigate("/", { replace: true });
  }

  if (!ready) {
    return (
      <div className="au-page">
        <main className="au"><p className="au-sub">Loading...</p></main>
      </div>
    );
  }

  return (
    <div className="au-page">
      <main className="au">
        <div className="au-logo"><Logo size={38} /></div>

        <div className="au-card">
          {!under ? (
            <>
              <h1>One more thing</h1>
              <p className="au-sub">
                Campusly is for people aged 18 and older. Please confirm before you continue.
              </p>

              <label className="au-agree">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => { setAgree(e.target.checked); setError(""); }}
                />
                <span>
                  I'm 18 or older, and I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
                </span>
              </label>

              {error && <div className="au-error">{error}</div>}
              <button className="au-btn" onClick={confirm} disabled={busy}>
                {busy ? "Saving..." : "Continue"}
              </button>
              <button className="au-link" onClick={() => setUnder(true)}>I'm under 18</button>
              <button className="au-link" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <h1>Sorry about that</h1>
              <p className="au-sub">
                Campusly is only for people aged 18 and older, so you can't use it yet. You're welcome
                back when you turn 18. You can delete your account now if you like.
              </p>
              <button className="au-btn" onClick={deleteAccount} disabled={busy}>
                {busy ? "Deleting..." : "Delete my account"}
              </button>
              <button className="au-link" onClick={logout}>Just log out</button>
              <button className="au-link" onClick={() => setUnder(false)}>Go back</button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}