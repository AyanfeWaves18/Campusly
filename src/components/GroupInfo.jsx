import { useCallback, useEffect, useState } from "react";
import { useToast } from "./Toast.jsx";
import { reportReasons } from "../utils/options.js";
import {
  deleteGroup,
  fetchGroupMembers,
  leaveGroup,
  removeGroupMember,
  reportGroup,
  resetGroupCode,
  updateGroup,
} from "../lib/groups.js";
import "./Modals.css";
import "./Groups.css";

const campuses = (n) => `${n} ${Number(n) === 1 ? "campus" : "campuses"}`;

// Everything about a group: invite link, members, and the things admins can do
export default function GroupInfo({ group, meId, onClose, onChanged, onLeft }) {
  const toast = useToast();
  const isAdmin = group.my_role === "admin";
  const link = group.join_code ? `${window.location.origin}/join/${group.join_code}` : "";

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description || "");
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    const res = await fetchGroupMembers(group.id);
    if (!res.error) setMembers(res.members);
    setLoadingMembers(false);
  }, [group.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied");
    } catch {
      toast("Couldn't copy. Press and hold the link to copy it.", "err");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: group.name, text: `Join "${group.name}" on Campusly`, url: link });
    } catch {
      /* closed without sharing */
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const res = await updateGroup(group.id, { name, description: desc, isPublic });
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Group updated");
    setEditing(false);
    onChanged();
  }

  async function newLink() {
    if (!window.confirm("Make a new link? The old link and code will stop working.")) return;
    setBusy(true);
    const res = await resetGroupCode(group.id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("New link ready");
    onChanged();
  }

  async function remove(m) {
    if (!window.confirm(`Remove ${m.name} from the group? They won't be able to join again.`)) return;
    setBusy(true);
    const res = await removeGroupMember(group.id, m.user_id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(`${m.name} was removed`);
    loadMembers();
    onChanged();
  }

  async function leave() {
    if (!window.confirm("Leave this group?")) return;
    setBusy(true);
    const res = await leaveGroup(group.id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("You left the group");
    onLeft();
  }

  async function del() {
    if (!window.confirm("Delete this group for everyone? All its messages will be lost.")) return;
    setBusy(true);
    const res = await deleteGroup(group.id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Group deleted");
    onLeft();
  }

  async function sendReport() {
    if (!reason) {
      toast("Pick a reason first", "err");
      return;
    }
    setBusy(true);
    const res = await reportGroup(group.id, reason);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Report sent. Thanks for keeping Campusly safe.");
    setReporting(false);
    setReason("");
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet gp-sheet" onClick={(e) => e.stopPropagation()}>
        {!editing ? (
          <>
            <h2>
              {group.name}
              {!group.is_public && <i className="ti ti-lock" style={{ marginLeft: 8, fontSize: "0.8em" }}></i>}
            </h2>
            {group.description && <p className="md-text">{group.description}</p>}
            <p className="gp-hint">
              {group.is_public ? "Public group" : "Private group"} · {group.member_count} of {group.max_members} members ·{" "}
              {campuses(group.campus_count)}
            </p>
          </>
        ) : (
          <form onSubmit={save}>
            <h2>Edit group</h2>
            <label className="gp-field" htmlFor="gi-name">Group name</label>
            <input id="gi-name" className="gp-input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            <label className="gp-field" htmlFor="gi-desc">Description</label>
            <textarea id="gi-desc" className="gp-input" maxLength={160} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div className="gp-field">Who can join</div>
            <div className="au-chips">
              <button type="button" className={`au-chip ${isPublic ? "on" : ""}`} onClick={() => setIsPublic(true)}>Public</button>
              <button type="button" className={`au-chip ${!isPublic ? "on" : ""}`} onClick={() => setIsPublic(false)}>Private</button>
            </div>
            <div className="md-row">
              <button type="button" className="md-btn ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="md-btn" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        )}

        {link && (
          <>
            <div className="gp-label">Invite people</div>
            <div className="gp-linkbox">
              <input className="gp-input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
              <button className="gp-small" onClick={copy}>Copy</button>
              {typeof navigator !== "undefined" && navigator.share && (
                <button className="gp-small" onClick={share}>Share</button>
              )}
            </div>
            <p className="gp-hint">Or give them the code: <b>{group.join_code}</b></p>
          </>
        )}

        <div className="gp-label">Members</div>
        {loadingMembers ? (
          <p className="gp-hint">Loading...</p>
        ) : (
          members.map((m) => (
            <div className="gp-member" key={m.user_id}>
              <div>
                <b>
                  {m.name}
                  {m.user_id === meId && " (you)"}
                  {m.role === "admin" && <span className="gp-admin">Admin</span>}
                </b>
                <span>{m.uni}</span>
              </div>
              {isAdmin && m.role !== "admin" && m.user_id !== meId && (
                <button className="gp-small danger" onClick={() => remove(m)} disabled={busy}>Remove</button>
              )}
            </div>
          ))
        )}

        {reporting && (
          <>
            <div className="gp-label">Why are you reporting this group?</div>
            <div className="md-reasons">
              {reportReasons.map((r) => (
                <label key={r} className={reason === r ? "on" : ""}>
                  <input type="radio" name="greason" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <div className="md-row">
              <button className="md-btn ghost" onClick={() => setReporting(false)} disabled={busy}>Cancel</button>
              <button className="md-btn" onClick={sendReport} disabled={busy}>Send report</button>
            </div>
          </>
        )}

        <div className="gp-stack">
          {isAdmin && !editing && (
            <>
              <button className="gp-small" onClick={() => setEditing(true)}>Edit name, description or privacy</button>
              <button className="gp-small" onClick={newLink} disabled={busy}>Make a new link</button>
            </>
          )}
          {!reporting && <button className="gp-small" onClick={() => setReporting(true)}>Report this group</button>}
          <button className="gp-small danger" onClick={leave} disabled={busy}>Leave group</button>
          {isAdmin && <button className="gp-small danger" onClick={del} disabled={busy}>Delete group for everyone</button>}
          <button className="gp-small" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}