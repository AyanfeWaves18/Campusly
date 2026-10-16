import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { DotsIcon, FilterIcon } from "../components/Icons.jsx";
import { ReportModal, ComplimentModal, Tour } from "../components/Modals.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { completeness } from "../utils/data.js";
import { departments, levels, genders } from "../utils/options.js";
import { fetchPeople } from "../lib/people.js";
import { fetchMyLikes, likePerson, unlikePerson } from "../lib/likes.js";
import "./Feed.css";

const COLORS = [
  ["#F4C0D1", "#72243E"],
  ["#CECBF6", "#3C3489"],
  ["#F5C4B3", "#712B13"],
  ["#9FE1CB", "#085041"],
  ["#FAC775", "#633806"],
  ["#C0DD97", "#27500A"],
  ["#B5D4F4", "#0C447C"],
];
const colorFor = (id) => COLORS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];

export default function Feed() {
  const navigate = useNavigate();
  const toast = useToast();
  const me = getUser() || {};
  const { pct, next } = completeness(me);

  const [people, setPeople] = useState([]);
  const [likes, setLikes] = useState([]);
  const [busyLike, setBusyLike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [scope, setScope] = useState(() => load("feed_scope", "campus"));
  const [mode, setMode] = useState(() => load("mode", ""));
  const [filters, setFilters] = useState({ department: "", level: "", gender: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [blocked, setBlocked] = useState(() => load("blocked", []));
  const [seed, setSeed] = useState(0);
  const [report, setReport] = useState(null);
  const [compliment, setCompliment] = useState(null);
  const [tour, setTour] = useState(false);

  async function loadPeople(showSkeleton) {
    if (showSkeleton) setLoading(true);
    const [res, likesRes] = await Promise.all([fetchPeople(me.id), fetchMyLikes()]);
    if (res.error) {
      setLoadError(res.error);
    } else {
      setLoadError("");
      setPeople(res.people);
    }
    if (!likesRes.error) setLikes(likesRes.ids);
    setLoading(false);
  }

  useEffect(() => {
    loadPeople(true).then(() => {
      if (!load("tour_done", false)) setTour(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull down at the top of the page to refresh
  async function refresh() {
    await loadPeople(false);
    setBlocked(load("blocked", []));
    setSeed((s) => s + 1);
    toast("Feed refreshed");
  }
  const { pull, refreshing } = usePullToRefresh(refresh);

  const list = useMemo(() => {
    const out = people.filter(
      (p) =>
        !blocked.includes(p.id) &&
        (!mode || p.lookingFor === mode || p.lookingFor === "Both") &&
        (!filters.department || p.department === filters.department) &&
        (!filters.level || p.level === filters.level) &&
        (!filters.gender || p.gender === filters.gender)
    );
    return seed > 0 ? [...out].sort(() => Math.random() - 0.5) : out;
  }, [people, blocked, mode, filters, seed]);

  const activeCount = [filters.department, filters.level, filters.gender, mode].filter(Boolean).length;

  function pickScope(v) {
    setScope(v);
    save("feed_scope", v);
  }
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

  // Shows the change at once, then saves it. If saving fails, the change is undone.
  async function toggleLike(p) {
    if (busyLike) return;
    const wasLiked = likes.includes(p.id);
    setBusyLike(p.id);
    setLikes((l) => (wasLiked ? l.filter((x) => x !== p.id) : [...l, p.id]));
    const res = wasLiked ? await unlikePerson(p.id) : await likePerson(p.id);
    setBusyLike(null);
    if (res.error) {
      setLikes((l) => (wasLiked ? [...l, p.id] : l.filter((x) => x !== p.id)));
      toast(res.error, "err");
      return;
    }
    if (!wasLiked) {
      if (res.match) toast(`It's a match with ${p.name}!`, "match");
      else    toast("Liked! You can send up to 3 free messages.");
    }
  }

  const answered = (p) => Object.entries(p.prompts || {}).find(([, a]) => a);

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

        <div className="fd-mode">
          <button className={scope === "campus" ? "on" : ""} onClick={() => pickScope("campus")}>
            My campus
          </button>
          <button className={scope === "other" ? "on" : ""} onClick={() => pickScope("other")}>
            Other campuses
          </button>
        </div>

        {scope === "other" ? (
          <div className="fd-soon">
            <i className="ti ti-world" aria-hidden="true"></i>
            <h3>This feature is coming soon</h3>
            <p>You'll be able to meet people from other universities once more campuses join Campusly.</p>
            <button onClick={() => pickScope("campus")}>Back to my campus</button>
          </div>
        ) : (
          <>
            <div className="fd-bar">
              <button
                className={`fd-filter-btn ${showFilters ? "on" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
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
            ) : loadError ? (
              <div className="empty">
                <i className="ti ti-wifi-off"></i>
                <h3>Couldn't load people</h3>
                <p>{loadError}</p>
                <a href="/feed" onClick={(e) => { e.preventDefault(); loadPeople(true); }}>Try again</a>
              </div>
            ) : people.length === 0 ? (
              <div className="empty">
                <i className="ti ti-users"></i>
                <h3>You're early</h3>
                <p>No one else from your campus has joined yet. Invite your friends to Campusly.</p>
              </div>
            ) : list.length === 0 ? (
              <div className="empty">
                <i className="ti ti-mood-empty"></i>
                <h3>No one matches these filters</h3>
                <p>Try clearing a filter.</p>
              </div>
            ) : (
              <div className="fd-list">
                {list.map((p) => {
                  const [bg, fg] = colorFor(p.id);
                  const prompt = answered(p);
                  const liked = likes.includes(p.id);
                  return (
                    <article className="fd-card" key={p.id}>
                      <div
                        className="fd-photo"
                        style={{ background: bg, color: fg }}
                        role="button"
                        onClick={() => navigate(`/user/${p.id}`)}
                      >
                        {p.photoUrl ? (
                          <img className="fd-img" src={p.photoUrl} alt={p.name} />
                        ) : (
                          <span className="fd-initial">{p.name?.[0]}</span>
                        )}
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
                          {p.name}
                          {p.verified && <i className="ti ti-rosette-discount-check vb" title="Verified"></i>}
                        </h2>
                        <div className="fd-meta">{p.department} · {p.level}</div>
                        {p.bio && <p>{p.bio}</p>}
                        {prompt && (
                          <div className="fd-prompt">
                            <small>{prompt[0]}</small>
                            <div>{prompt[1]}</div>
                          </div>
                        )}
                        <div className="fd-tags">
                          {p.tags.map((t) => <span key={t}>{t}</span>)}
                          <span className="fd-campus">{p.uni}</span>
                        </div>
                        <div className="fd-actions">
                          <button className={`fd-like ${liked ? "on" : ""}`} onClick={() => toggleLike(p)}>
                            <i className="ti ti-heart"></i> {liked ? "Liked" : "Like"}
                          </button>
                          <button className="fd-msg"    onClick={() => navigate(`/chat/${p.id}`)}>
                            <i className="ti ti-message"></i> Message
                          </button>
                          <button className="fd-ico" onClick={() => setCompliment(p)} aria-label="Send anonymous compliment">
                            <i className="ti ti-sparkles"></i>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {report && (
        <ReportModal
          profile={report}
          onClose={() => setReport(null)}
          onDone={() => loadPeople(false)}
        />
      )}
      {compliment && <ComplimentModal profile={compliment} onClose={() => setCompliment(null)} />}
      {tour && <Tour onClose={() => setTour(false)} />}
    </AppLayout>
  );
}