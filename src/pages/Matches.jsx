import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { load } from "../utils/storage.js";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { profiles } from "../utils/data.js";
import "./Pages.css";

export default function Matches() {
  const navigate = useNavigate();
  const likes = load("likes", []);
  const blocked = load("blocked", []);
  const liked = profiles.filter((p) => likes.includes(p.id) && !blocked.includes(p.id));
  const matches = liked.filter((p) => p.likedYou);
  const waiting = liked.length - matches.length;

  return (
    <AppLayout>
      <div className="pg">
        <h1>Matches</h1>
        <p className="pg-sub">People who liked you back.</p>

        {matches.length === 0 ? (
          <div className="empty">
            <i className="ti ti-heart-off"></i>
            <h3>No matches yet</h3>
            <p>Like people on the feed. When they like you back, they'll show up here.</p>
            <Link to="/feed">Go to the feed</Link>
          </div>
        ) : (
          <div className="mt-grid">
            {matches.map((p) => (
              <div className="mt-card" key={p.id}>
                <div
                  className="mt-photo"
                  style={{ background: p.bg, color: p.fg, cursor: "pointer" }}
                  onClick={() => navigate(`/user/${p.id}`)}
                >
                  {p.name[0]}
                </div>
                <div className="mt-body">
                  <b style={{ cursor: "pointer" }} onClick={() => navigate(`/user/${p.id}`)}>
                    {p.name}, {p.age}
                    {p.verified && <i className="ti ti-rosette-discount-check vb"></i>}
                  </b>
                  <small>{p.department}</small>
                  <button onClick={() => navigate(`/chat/${p.id}`)}>Say hi</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {waiting > 0 && (
          <p className="pg-note">
            You've liked {waiting} {waiting === 1 ? "person" : "people"} who haven't liked you back yet.
          </p>
        )}
      </div>
    </AppLayout>
  );
}