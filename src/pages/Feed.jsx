import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { DotsIcon, FilterIcon } from "../components/Icons.jsx";
import { ReportModal, ComplimentModal, Tour } from "../components/Modals.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { profiles, completeness } from "../utils/data.js";
import { departments, levels, genders } from "../utils/options.js";
import "./Feed.css";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Feed() {
  const navigate = useNavigate();
  const toast = useToast();
  const me = getUser() || {};
  const { pct, next } = completeness(me);

  const [likes, setLikes] = useState(() => load("likes", []));
  const [blocked, setBlocked] = useState(() => load("blocked", []));
  const [mode, setMode] = useState(() => load("mode", ""));
  const [filters, setFilters] = useState({ department: "", level: "", gender: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(0);
  const [report, setReport] = useState(null);
  const [compliment, setCompliment] = useState(null);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      if (!load("tour_done", false)) setTour(true);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Pull down at the top of the page to refresh
  async function refresh() {
    setLoading(true);
    await wait(900);
    setLikes(load("likes", []));
    setBlocked(load("blocked", []));
    setSeed((s) => s + 1);
    setLoading(false);
    toast("Feed refreshed");
  }
  const { pull, refreshing } = usePullToRefresh(refresh);

  const list = useMemo(() => {
    const out = profiles.filter(
      (p) =>
        !blocked.includes(p.id) &&
        (!mode || p.lookingFor === mode || p.lookingFor === "Both") &&
        (!filters.department || p.department === filters.department) &&
        (!filters.level || p.level === filters.level) &&
        (!filters.gender || p.gender === filters.gender)
    );
    return seed > 0 ? [...out].sort(() => Math.random() - 0.5) : out;
  }, [blocked, mode, filters, seed]);

  const activeCount = [filters.department, filters.level, filters.gender, mode].filter(Boolean).length;

  function pickMode(v) {
    setMode(v);
    save("mode", v);
  }

  function setFilter(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  function clearAll() {
    setFilters({ department: "", level: "", gender: "" });
    pickMode("");
  }

  function toggleLike(p) {
    if (likes.includes(p.id)) {
      const nextLikes = likes.filter((x) => x !== p.id);
      setLikes(nextLikes);
      save("likes", nextLikes);
      return;
    }
    const nextLikes = [...likes, p.id];
    setLikes(nextLikes);
    save("likes", nextLikes);
    if (p.likedYou) toast(`It's a match with ${p.name}!`, "match");
    else toast("Liked!");
  }

  return (
    <AppLayout>
      <PullIndicator pull={pull} refreshing={refreshing} top={70} />

      <div className="fd-wrap">
        {pct < 100 && (
          <Link to="/profile" className="fd-banner">
            <div>
              Your profile is <b>{pct}%</b> done. {next}.
            </div>
            <div className="pb"><span style={{ width: `${pct}%` }}></span></div>
          </Link>
        )}

        <div className="fd-bar">
          <button className={`fd-filter-btn ${showFilters ? "on" : ""}`} onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon size={18} /> Filters
            {activeCount > 0 && <b className="fd-count">{activeCount}</b>}
          </button>
          {activeCount > 0 && (
            <button className="fd-clear" onClick={clearAll}>Clear</button>
          )}
        </div>

        {showFilters && (
          <div className="fd-panel">
            <div className="fd-mode">
              {[["", "All"], ["Dating", "Dates"], ["Friends", "Friends"]].map(([v, l]) => (
                <button key={l} className={mode === v ? "on" : ""} onClick={() => pickMode(v)}>{l}</button>
              ))}
            </div>
            <div className="fd-filters">
              <select name="department" value={filters.department} onChange={setFilter}>
                <option value="">Department</option>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select name="level" value={filters.level} onChange={setFilter}>
                <option value="">Level</option>
                {levels.map((l) => <option key={l}>{l}</option>)}
              </select>
              <select name="gender" value={filters.gender} onChange={setFilter}>
                <option value="">Gender</option>
                {genders.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="fd-list">
            {[1, 2, 3].map((n) => (
              <div className="fd-card" key={n}>
                <div className="sk sk-photo"></div>
                <div className="fd-body">
                  <div className="sk sk-line w60"></div>
                  <div className="sk sk-line w90"></div>
                  <div className="sk sk-line w40"></div>
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <i className="ti ti-mood-empty"></i>
            <h3>No one matches these filters</h3>
            <p>Try clearing a filter.</p>
          </div>
        ) : (
          <div className="fd-list">
            {list.map((p) => (
              <article className="fd-card" key={p.id}>
                <div
                  className="fd-photo"
                  style={{ background: p.bg, color: p.fg }}
                  role="button"
                  onClick={() => navigate(`/user/${p.id}`)}
                >
                  <span className="fd-initial">{p.name[0]}</span>
                  <button
                    className="fd-dots"
                    title="Block or report"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReport(p);
                    }}
                    aria-label="Block or report"
                  >
                    <DotsIcon size={20} />
                  </button>
                </div>
                <div className="fd-body">
                  <h2 className="fd-name" onClick={() => navigate(`/user/${p.id}`)}>
                    {p.name}, {p.age}
                    {p.verified && <i className="ti ti-rosette-discount-check vb" title="Verified"></i>}
                  </h2>
                  <div className="fd-meta">{p.department} · {p.level}</div>
                  <p>{p.bio}</p>
                  <div className="fd-prompt">
                    <small>{p.prompt.q}</small>
                    <div>{p.prompt.a}</div>
                  </div>
                  <div className="fd-tags">
                    {p.tags.map((t) => <span key={t}>{t}</span>)}
                  </div>
                  <div className="fd-actions">
                    <button className={`fd-like ${likes.includes(p.id) ? "on" : ""}`} onClick={() => toggleLike(p)}>
                      <i className="ti ti-heart"></i> {likes.includes(p.id) ? "Liked" : "Like"}
                    </button>
                    <button className="fd-msg" onClick={() => navigate(`/chat/${p.id}`)}>
                      <i className="ti ti-message"></i> Message
                    </button>
                    <button className="fd-ico" onClick={() => setCompliment(p)} aria-label="Send anonymous compliment">
                      <i className="ti ti-sparkles"></i>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {report && (
        <ReportModal
          profile={report}
          onClose={() => setReport(null)}
          onDone={() => setBlocked(load("blocked", []))}
        />
      )}
      {compliment && <ComplimentModal profile={compliment} onClose={() => setCompliment(null)} />}
      {tour && <Tour onClose={() => setTour(false)} />}
    </AppLayout>
  );
}