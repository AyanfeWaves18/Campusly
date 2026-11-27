import { useCallback, useEffect, useState } from "react";
import { useToast } from "./Toast.jsx";
import {
  adminDismissGroupReports,
  adminGroupDetail,
  adminGroups,
  adminRemoveGroup,
} from "../lib/admin.js";
import "./Modals.css";

const day = (t) => new Date(t).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
const stamp = (t) =>
  new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;

/* One group: who is in it, what was reported, the latest messages, and the remove button */
function GroupSheet({ id, onClose, onChanged, onPerson }) {
  const toast = useToast();
  const [g, setG] = useState(null);
  const [error, setError] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminGroupDetail(id);
    if (res.error) setError(res.error);
    else {
      setError("");
      setG(res.group);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss() {
    if (!window.confirm("Clear the reports on this group? Use this when you've looked and it's fine.")) return;
    setBusy(true);
    const res = await adminDismissGroupReports(id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Reports cleared");
    await load();
    onChanged?.();
  }

  async function remove() {
    const ok = window.confirm(
      `Remove "${g.name}"?\n\nThe group, all its messages and its member list are deleted for good. Members will see that the group is gone. This can't be undone.`
    );
    if (!ok) return;
    setBusy(true);
    const res = await adminRemoveGroup(id, why);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Group removed");
    onChanged?.();
    onClose();
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet ad-sheet" onClick={(e) => e.stopPropagation()}>
        {!g && !error && <p className="md-text">Loading...</p>}
        {error && <p className="md-text">{error}</p>}

        {g && (
          <>
            <h2>
              {g.name}
              <span className="ad-pill" style={{ marginLeft: 8 }}>{g.is_public ? "Public" : "Private"}</span>
            </h2>
            {g.description && <p className="md-text">"{g.description}"</p>}

            <div className="ad-kv">
              <span>Created</span><span>{day(g.created_at)}</span>
              <span>Created by</span><span>{g.creator_name || "A deleted account"}</span>
              <span>Members</span><span>{g.members.length} of {g.max_members}</span>
              <span>Messages</span><span>{g.message_count}</span>
              <span>Reports</span><span>{g.reports.length}</span>
            </div>

            {g.reports.length > 0 && (
              <>
                <h3 className="ad-h3">Reports</h3>
                {g.reports.map((r, i) => (
                  <div className="ev-meta" key={i} style={{ marginBottom: 6 }}>
                    <b>{r.reason}</b> · {r.reporter_name || "A deleted account"} · {stamp(r.created_at)}
                  </div>
                ))}
              </>
            )}

            <h3 className="ad-h3">Latest messages</h3>
            {!g.messages_shown ? (
              <p className="md-text">
                Messages are only shown for groups that have been reported. Opening them is recorded in the activity log.
              </p>
            ) : g.messages.length === 0 ? (
              <p className="md-text">No messages.</p>
            ) : (
              <div className="ad-ctx">
                {g.messages.map((m, i) => (
                  <div key={i}>
                    <b>{m.sender_name || "A deleted account"}:</b> {m.body}
                  </div>
                ))}
              </div>
            )}

            <h3 className="ad-h3">Members</h3>
            {g.members.map((m) => (
              <div className="ev-meta" key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{m.name || "A deleted account"}</b>
                  {m.uni ? ` · ${m.uni}` : ""}
                  {m.role === "admin" ? " · group admin" : ""}
                  {m.suspended && <span className="ad-pill open" style={{ marginLeft: 6 }}>Suspended</span>}
                </span>
                {m.name && (
                  <button className="ad-small" onClick={() => onPerson?.(m.id)}>View</button>
                )}
              </div>
            ))}

            <h3 className="ad-h3">Remove this group</h3>
            <textarea
              rows="2"
              maxLength="150"
              placeholder="Reason (saved in the activity log)"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
            <div className="md-row">
              <button className="md-btn ghost" onClick={onClose} disabled={busy}>Close</button>
              {g.reports.length > 0 && (
                <button className="md-btn ghost" onClick={dismiss} disabled={busy}>Clear reports</button>
              )}
              <button className="md-btn danger" onClick={remove} disabled={busy}>
                {busy ? "Please wait..." : "Remove group"}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="md-row">
            <button className="md-btn ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* The Groups tab: reported groups first, and a search for any group */
export default function AdminGroups({ onPerson, onChanged }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [searched, setSearched] = useState(false); // true while the list shows a name search
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);

  const loadReported = useCallback(async () => {
    const res = await adminGroups("");
    setRows(res.rows);
    setSearched(false);
    if (res.error) toast(res.error, "err");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReported();
  }, [loadReported]);

  async function search(e) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) {
      loadReported();
      return;
    }
    if (term.length < 2) {
      toast("Type at least 2 letters", "err");
      return;
    }
    setBusy(true);
    const res = await adminGroups(term);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setRows(res.rows);
    setSearched(true);
  }

  function changed() {
    if (searched && q.trim().length >= 2) adminGroups(q.trim()).then((res) => setRows(res.rows));
    else loadReported();
    onChanged?.();
  }

  return (
    <>
      <form className="ad-find" onSubmit={search}>
        <input
          placeholder="Search groups by name"
          value={q}
          maxLength="50"
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="in-btn" disabled={busy}>{busy ? "..." : "Search"}</button>
      </form>

      {rows === null ? (
        <p className="pg-note">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <i className="ti ti-flag-off"></i>
          <h3>{searched ? "No groups found" : "No reported groups"}</h3>
          <p>{searched ? "Try a different spelling." : "When someone reports a group, it shows up here."}</p>
        </div>
      ) : (
        <>
          <p className="pg-note">{searched ? "Groups matching your search" : "Reported groups, newest report first"}</p>
          {rows.map((g) => (
            <button className="row" key={g.id} onClick={() => setOpenId(g.id)}>
              <div className="row-main">
                <b>
                  {g.name}
                  {!g.is_public && <i className="ti ti-lock" style={{ marginLeft: 6, fontSize: "0.85em" }}></i>}
                  {Number(g.report_count) > 0 && (
                    <span className="ad-pill open" style={{ marginLeft: 8 }}>{plural(g.report_count, "report")}</span>
                  )}
                </b>
                <span>
                  {plural(g.member_count, "member")} · {plural(g.message_count, "message")}
                  {g.last_report_at ? ` · last report ${day(g.last_report_at)}` : ""}
                </span>
              </div>
            </button>
          ))}
        </>
      )}

      {openId && (
        <GroupSheet id={openId} onClose={() => setOpenId(null)} onChanged={changed} onPerson={onPerson} />
      )}
    </>
  );
}