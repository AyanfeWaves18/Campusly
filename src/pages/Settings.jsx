import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Captcha from "../components/Captcha.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../lib/supabase.js";
import { removeAllMyPhotos } from "../lib/photos.js";
import { removeAllMyVoiceNotes } from "../lib/voice.js";
import { changeMyPassword, saveProfileToCloud } from "../lib/profile.js";
import { fetchMyBlocks, unblockPerson } from "../lib/blocks.js";
import {
  applyTheme,
  currentTheme,
  deleteMyAccount,
  getUser,
  setLoggedIn,
  toggleTheme,
} from "../utils/storage.js";
import { checkPassword } from "../utils/validate.js";
import "./Inner.css";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(() => getUser() || {});
  const [name, setName] = useState(user.name || "");
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [theme, setTheme] = useState(currentTheme());
  const [blocks, setBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadBlocks() {
    const res = await fetchMyBlocks();
    if (res.error) toast(res.error, "err");
    else setBlocks(res.blocks);
    setBlocksLoading(false);
  }

  useEffect(() => {
    loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Your name can't be empty", "err");
      return;
    }
    setSavingName(true);
    const { error } = await saveProfileToCloud({ name });
    setSavingName(false);
    if (error) {
      toast(error, "err");
      return;
    }
    setUser(getUser());
    toast("Name saved");
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!pw.current) {
      toast("Enter your current password", "err");
      return;
    }
    const pwError = checkPassword(pw.next);
    if (pwError) {
      toast(pwError, "err");
      return;
    }
    setSavingPw(true);
    const { error } = await changeMyPassword(pw.current, pw.next, captchaToken);
    setSavingPw(false);
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
    if (error) {
      toast(error, "err");
      return;
    }
    setPw({ current: "", next: "" });
    toast("Password changed");
  }

  // Saves to the cloud; if that fails, the switch goes back to where it was
  async function togglePrivacy(key) {
    const next = { ...user.privacy, [key]: !user.privacy?.[key] };
    setUser({ ...user, privacy: next });
    const { error } = await saveProfileToCloud({ privacy: next });
    if (error) {
      setUser(getUser());
      toast(error, "err");
    }
  }

  async function unblock(id) {
    setUnblocking(id);
    const res = await unblockPerson(id);
    setUnblocking(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setBlocks((list) => list.filter((b) => b.blocked_id !== id));
    toast("Unblocked");
  }

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    navigate("/login");
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "Delete your account?\n\nYour profile, photos, matches and chats will be removed. You can sign up again later with the same email or phone number."
    );
    if (!ok) return;
    setDeleting(true);

    await removeAllMyPhotos();
    await removeAllMyVoiceNotes();

    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      toast("Couldn't delete your account. Please try again.", "err");
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    deleteMyAccount(user);
    applyTheme();
    navigate("/");
  }

  return (
    <AppLayout>
      <div className="in-wrap">
        <form className="in-card" onSubmit={saveName}>
          <h2>Account details</h2>
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Phone number</label>
          <input type="tel" value={user.phone || ""} disabled />
          <label>Email</label>
          <input type="email" value={user.email || ""} disabled />
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "-4px 0 14px" }}>
            Changing your email or phone number is coming soon.
          </p>
          <button type="submit" className="in-btn" disabled={savingName}>
            {savingName ? "Saving..." : "Save name"}
          </button>
        </form>

        <form className="in-card" onSubmit={changePassword}>
          <h2>Change password</h2>
          <label>Current password</label>
          <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <label>New password</label>
          <input type="password" maxLength="15" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />
          <button type="submit" className="in-btn" disabled={savingPw}>
            {savingPw ? "Saving..." : "Change password"}
          </button>
        </form>

        <div className="in-card">
          <h2>Appearance</h2>
          <label className="in-toggle">
            <span>Light mode</span>
            <input type="checkbox" checked={theme === "light"} onChange={() => setTheme(toggleTheme())} />
          </label>
        </div>

        <div className="in-card">
          <h2>Verification</h2>
          <div className="in-row">
            <span>Status</span>
            <span>
              {user.verified ? (
                <>Verified <i className="ti ti-rosette-discount-check vb"></i></>
              ) : (
                <Link to="/verify" style={{ color: "var(--pink)" }}>Verify now</Link>
              )}
            </span>
          </div>
        </div>

        <div className="in-card">
          <h2>Privacy</h2>
          <label className="in-toggle">
            <span>Hide my profile from everyone</span>
            <input type="checkbox" checked={!!user.privacy?.hideAll} onChange={() => togglePrivacy("hideAll")} />
          </label>
          <label className="in-toggle">
            <span>Hide my profile from my department</span>
            <input type="checkbox" checked={!!user.privacy?.hideDept} onChange={() => togglePrivacy("hideDept")} />
          </label>
        </div>

        <div className="in-card">
          <h2>Blocked people</h2>
          {blocksLoading ? (
            <p>Loading...</p>
          ) : blocks.length === 0 ? (
            <p>You haven't blocked anyone.</p>
          ) : (
            blocks.map((b) => (
              <div className="in-row" key={b.blocked_id}>
                <span style={{ color: "var(--text)" }}>{b.blocked_name || "Someone"}</span>
                <button
                  className="in-btn ghost"
                  style={{ padding: "6px 16px" }}
                  onClick={() => unblock(b.blocked_id)}
                  disabled={unblocking === b.blocked_id}
                >
                  {unblocking === b.blocked_id ? "..." : "Unblock"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="in-card">
          <h2>Session</h2>
          <div className="in-btns">
            <button className="in-btn ghost" onClick={logout}>Log out</button>
            <button className="in-btn danger" onClick={deleteAccount} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}