import { useCallback, useEffect, useState } from "react";
import { useToast } from "./Toast.jsx";
import { createInvite, listInvites, setInviteActive } from "../lib/admin.js";

const statusOf = (r) => {
  if (!r.active) return "Off";
  if (r.expires_at && new Date(r.expires_at) < new Date()) return "Expired";
  if (r.uses >= r.max_uses) return "Full";
  return "Active";
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

export default function AdminInvites() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ label: "", max: "20", days: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await listInvites();
    if (res.error) toast(res.error, "err");
    else setRows(res.rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    const max = Number(form.max);
    const days = form.days ? Number(form.days) : null;
    if (!Number.isInteger(max) || max < 1 || max > 1000) {
      toast("How many people can use it? Choose 1 to 1000.", "err");
      return;
    }
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365)) {
      toast("Days must be 1 to 365, or leave it empty.", "err");
      return;
    }
    setBusy(true);
    const res = await createInvite(form.label.trim(), max, days);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(`Code ${res.code} created`);
    setForm({ label: "", max: "20", days: "" });
    load();
  }

  async function copyLink(code) {
    const link = `${window.location.origin}/signup?code=${code}`;
    const ok = await copyText(`Join me on Campusly! Sign up here: ${link}`);
    toast(ok ? "Invite link copied" : "Couldn't copy. Select and copy it yourself.", ok ? "ok" : "err");
  }

  async function toggle(r) {
    const res = await setInviteActive(r.code, !r.active);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(r.active ? "Code switched off" : "Code switched on");
    load();
  }

  return (
    <>
      <form className="in-card" onSubmit={create} style={{ marginBottom: 18 }}>
        <h2>Create an invite code</h2>

        <label>Label (so you remember who it's for)</label>
        <input
          maxLength="60"
          placeholder="Computer Science freshers"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />

        <label>How many people can use it?</label>
        <input
          type="number"
          min="1"
          max="1000"
          value={form.max}
          onChange={(e) => setForm({ ...form, max: e.target.value })}
        />

        <label>Valid for how many days? (optional)</label>
        <input
          type="number"
          min="1"
          max="365"
          placeholder="Leave empty for no expiry"
          value={form.days}
          onChange={(e) => setForm({ ...form, days: e.target.value })}
        />

        <button type="submit" className="in-btn" disabled={busy}>
          {busy ? "Creating..." : "Create code"}
        </button>
      </form>

      {rows === null ? (
        <p className="pg-note">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <i className="ti ti-ticket"></i>
          <h3>No codes yet</h3>
          <p>Create one above, then copy its link and send it to people you trust.</p>
        </div>
      ) : (
        rows.map((r) => {
          const st = statusOf(r);
          return (
            <div className="ev-card" key={r.code}>
              <span className={`ad-pill ${st === "Active" ? "open" : ""}`}>{st}</span>
              <h3 className="ic-code">{r.code}</h3>
              <div className="ev-meta">
                {r.label || "No label"} · {r.uses} of {r.max_uses} used
                {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : ""}
              </div>
              <div className="ad-row-actions">
                <button className="ad-small" onClick={() => copyLink(r.code)}>Copy invite link</button>
                <button className={`ad-small ${r.active ? "danger" : ""}`} onClick={() => toggle(r)}>
                  {r.active ? "Switch off" : "Switch on"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}