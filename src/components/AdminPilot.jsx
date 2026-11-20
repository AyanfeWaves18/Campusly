import { useCallback, useEffect, useState } from "react";
import { fetchAdminPilot } from "../lib/admin.js";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function AdminPilot() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetchAdminPilot();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError("");
    setD(res.pilot);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="empty">
        <h3>{error}</h3>
        <p>Make sure the pilot SQL script has been run in Supabase.</p>
        <a href="/admin" onClick={(e) => { e.preventDefault(); load(); }}>Try again</a>
      </div>
    );
  }
  if (!d) return <p className="pg-note">Loading the scoreboard...</p>;

  const people = Number(d.people);
  const veterans = Number(d.veterans);
  const veteransActive = Number(d.veterans_active);
  const stay = pct(veteransActive, veterans);
  const tooEarly = veterans < 5;
  const tone = tooEarly ? "" : stay >= 40 ? "ad-good" : stay >= 20 ? "ad-warn" : "ad-bad";

  return (
    <>
      <div className="rq-label" style={{ marginTop: 0 }}>Pilot scoreboard</div>

      <div className="ad-stats">
        <div className="ad-stat">
          <b>{people}</b>
          <span>People signed up</span>
          <small>{people ? `${pct(Number(d.with_photo), people)}% have a photo` : "None yet"}</small>
        </div>
        <div className="ad-stat">
          <b>{Number(d.joined_7d)}</b>
          <span>Joined this week</span>
          <small>Last 7 days</small>
        </div>
        <div className="ad-stat">
          <b>{Number(d.active_7d)}</b>
          <span>Active this week</span>
          <small>{Number(d.active_prev_7d)} the week before</small>
        </div>
        <div className="ad-stat">
          <b className={tone}>{tooEarly ? "-" : `${stay}%`}</b>
          <span>Still coming back</span>
          <small>
            {tooEarly
              ? "Too early: fewer than 5 people are over a week old"
              : `${veteransActive} of ${veterans} who joined over a week ago were active this week`}
          </small>
        </div>
        <div className="ad-stat"><b>{Number(d.likes)}</b><span>Likes</span></div>
        <div className="ad-stat"><b>{Number(d.matches)}</b><span>Matches</span></div>
        <div className="ad-stat"><b>{Number(d.messages)}</b><span>Messages and voice notes</span></div>
        <div className="ad-stat"><b>{Number(d.compliments)}</b><span>Compliments</span></div>
        <div className="ad-stat"><b>{Number(d.event_plans)}</b><span>"I'm going" plans</span></div>
        <div className="ad-stat"><b className={Number(d.open_reports) > 0 ? "ad-bad" : ""}>{Number(d.open_reports)}</b><span>Open reports</span></div>
      </div>

      <p className="pg-note" style={{ marginTop: 0 }}>
        "Active" means someone sent a message or gave a like. Admin accounts aren't counted as people.{" "}
        <a href="/admin" onClick={(e) => { e.preventDefault(); load(); }}>
          {busy ? "Refreshing..." : "Refresh"}
        </a>
      </p>

      <div className="rq-label">Registrations</div>
    </>
  );
}