import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  applyTheme,
  currentTheme,
  deleteMyAccount,
  emailKey,
  findActiveAccount,
  getUser,
  load,
  saveUser,
  setLoggedIn,
  toggleTheme,
  unblockUser,
  updateRegistry,
} from "../utils/storage.js";
import { checkPassword } from "../utils/validate.js";
import { profiles } from "../utils/data.js";
import "./Inner.css";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(() => getUser() || {});
  const [account, setAccount] = useState({ name: user.name || "", phone: user.phone || "", email: user.email || "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [theme, setTheme] = useState(currentTheme());
  const [blocked, setBlocked] = useState(() => load("blocked", []));

  function saveAccount(e) {
    e.preventDefault();
    if (!account.name.trim() || !account.phone.trim() || !account.email.includes("@")) {
      toast("Check your name, phone number, and email", "err");
      return;
    }
    // The new email or phone number can't belong to another active account
    const taken = findActiveAccount(account.email, account.phone, user.accountId);
    if (taken) {
      toast(
        taken.email === emailKey(account.email)
          ? "That email is already used by another account"
          : "That phone number is already used by another account",
        "err"
      );
      return;
    }
    const updated = { ...user, ...account };
    saveUser(updated);
    if (user.accountId) updateRegistry(user.accountId, account);
    setUser(updated);
    toast("Account details saved");
  }

  function changePassword(e) {
    e.preventDefault();
    if (pw.current !== user.password) {
      toast("Your current password is incorrect", "err");
      return;
    }
    const pwError = checkPassword(pw.next);
    if (pwError) {
      toast(pwError, "err");
      return;
    }
    const updated = { ...user, password: pw.next };
    saveUser(updated);
    setUser(updated);
    setPw({ current: "", next: "" });
    toast("Password changed");
  }

  function togglePrivacy(key) {
    const updated = { ...user, privacy: { ...user.privacy, [key]: !user.privacy?.[key] } };
    saveUser(updated);
    setUser(updated);
  }

  function unblock(id) {
    unblockUser(id);
    setBlocked(load("blocked", []));
    toast("Unblocked");
  }

  function logout() {
    setLoggedIn(false);
    navigate("/login");
  }

  function deleteAccount() {
    const ok = window.confirm(
      "Delete your account?\n\nYour profile, photos, matches and chats will be removed. You can sign up again later with the same email or phone number."
    );
    if (!ok) return;
    deleteMyAccount(user); // removes your data, keeps a registration record
    applyTheme();
    navigate("/");
  }

  const blockedProfiles = profiles.filter((p) => blocked.includes(p.id));

  return (
    <AppLayout>
      <div className="in-wrap">
        <form className="in-card" onSubmit={saveAccount}>
          <h2>Account details</h2>
          <label>Full name</label>
          <input value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
          <label>Phone number</label>
          <input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
          <label>Email</label>
          <input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
          <button type="submit" className="in-btn">Save details</button>
        </form>

        <form className="in-card" onSubmit={changePassword}>
          <h2>Change password</h2>
          <label>Current password</label>
          <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <label>New password</label>
          <input type="password" maxLength="15" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <button type="submit" className="in-btn">Change password</button>
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
          {blockedProfiles.length === 0 ? (
            <p>You haven't blocked anyone.</p>
          ) : (
            blockedProfiles.map((p) => (
              <div className="in-row" key={p.id}>
                <span style={{ color: "var(--text)" }}>{p.name}</span>
                <button className="in-btn ghost" style={{ padding: "6px 16px" }} onClick={() => unblock(p.id)}>Unblock</button>
              </div>
            ))
          )}
        </div>

        <div className="in-card">
          <h2>Session</h2>
          <div className="in-btns">
            <button className="in-btn ghost" onClick={logout}>Log out</button>
            <button className="in-btn danger" onClick={deleteAccount}>Delete account</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}