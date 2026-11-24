import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { DotsIcon, FilterIcon } from "../components/Icons.jsx";
import { ReportModal, ComplimentModal, Tour } from "../components/Modals.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { useToast } from "../components/Toast.jsx";
import { NotifyBanner } from "../components/NotifyCard.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { completeness } from "../utils/data.js";
import { levels, genders } from "../utils/options.js";
import FilterPicker from "../components/FilterPicker.jsx";
import { departmentsFor } from "../utils/departments.js";
import { UNIVERSITIES } from "../utils/universities.js";
import { fetchPeople, fetchMyOpen, setOtherCampuses } from "../lib/people.js";
import { fetchMyLikes, likePerson, unlikePerson } from "../lib/likes.js";
import { syncPush } from "../lib/push.js";
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
  const [openToOthers, setOpenToOthers] = useState(() => load("other_open", false));
  const [switching, setSwitching] = useState(false);
  const [mode, setMode] = useState(() => load("mode", ""));
  const [filters, setFilters] = useState({ department: "", level: "", gender: "", uni: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [blocked, setBlocked] = useState(() => load("blocked", []));
  const [seed, setSeed] = useState(0);
  const [report, setReport] = useState(null);
  const [compliment, setCompliment] = useState(null);
  const [tour, setTour] = useState(false);

  // The newest scope, so refreshing and reloading always use the one on screen
  const scopeRef = useRef(scope);
  // Counts loads, so a slow answer for a campus you already left never replaces the one on screen
  const reqId = useRef(0);
  // The newest "visible to other campuses" value, for the same reason. The last known value is kept
  // on the device, so the page doesn't flash the wrong message while it checks.
  const openRef = useRef(load("other_open", false));
  function setOpen(v) {
    openRef.current = v;
    setOpenToOthers(v);
    save("other_open", v);
  }

  async function loadPeople(showSkeleton, s = scopeRef.current) {
    const id = ++reqId.current;
    if (showSkeleton) setLoading(true);
    // While the switch is off, nobody on other campuses can be seen, so there is nothing to ask for
    if (s === "other" && !openRef.current) {
      setLoadError("");
      setPeople([]);
      setLoading(false);
      return;
    }
    const [res, likesRes] = await Promise.all([fetchPeople(me.id, me.uni, s), fetchMyLikes()]);
    if (id !== reqId.current) return; // a newer load has started, so drop this one
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
    (async () => {
      syncPush(me.id); // keeps this phone connected for notifications, if they are on
      const open = await fetchMyOpen(me.id);
      setOpen(open);
      await loadPeople(true, scopeRef.current);
      if (!load("tour_done", false)) setTour(true);
    })();
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

  // Every university on the list, plus any school people typed in themselves, A to Z.
  // Searching works on the full name or the short name, like UNILAG.
  const uniOptions = useMemo(() => {
    const byName = new Map();
    Object.values(UNIVERSITIES)
      .flat()
      .forEach((u) => byName.set(u.name, { value: u.name, hint: u.short }));
    people.forEach((p) => {
      if (p.uni && !byName.has(p.uni)) byName.set(p.uni, { value: p.uni, hint: "" });
    });
    return [...byName.values()].sort((a, b) => a.value.localeCompare(b.value));
  }, [people]);

  // The department filter follows the school: yours on My campus, the chosen one on Other campuses.
  // With no school chosen there, it lists the departments of the people you can see.
  const deptOptions = useMemo(() => {
    if (scope !== "other") return departmentsFor(me.uni);
    if (filters.uni) return departmentsFor(filters.uni);
    return [...new Set(people.map((p) => p.department).filter(Boolean))].sort();
  }, [scope, me.uni, filters.uni, people]);

  const deptItems = useMemo(() => deptOptions.map((d) => ({ value: d })), [deptOptions]);

  const list = useMemo(() => {
    const out = people.filter(
      (p) =>
        !blocked.includes(p.id) &&
        (!mode || p.lookingFor === mode || p.lookingFor === "Both") &&
        (!filters.department || p.department === filters.department) &&
        (!filters.level || p.level === filters.level) &&
        (!filters.gender || p.gender === filters.gender) &&
        (!filters.uni || p.uni === filters.uni)
    );
    return seed > 0 ? [...out].sort(() => Math.random() - 0.5) : out;
  }, [people, blocked, mode, filters, seed]);

  const activeCount = [filters.department, filters.level, filters.gender, filters.uni, mode].filter(Boolean).length;

  function pickScope(v) {
    if (v === scopeRef.current) return;
    scopeRef.current = v;
    setScope(v);
    save("feed_scope", v);
    setFilters((f) => ({ ...f, uni: "", department: "" }));
    loadPeople(true, v);
  }

  // The switch on the Other campuses page: it decides whether you see people there and they see you
  async function toggleOpen(on) {
    if (switching) return;
    setSwitching(true);
    const res = await setOtherCampuses(on);
    setSwitching(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setOpen(on);
    if (on) {
      toast("You're visible to other campuses.");
      loadPeople(true, "other");
    } else {
      setPeople([]);
      toast("You're not visible to other campuses until you switch it back on.");
    }
  }

  function pickMode(v) {
    setMode(v);
    save("mode", v);
  }
  function setFilterValue(name, value) {
    const next = { ...filters, [name]: value };
    // A new school has its own departments, so the old department choice is dropped
    if (name === "uni") next.department = "";
    setFilters(next);
  }
  function setFilter(e) {
    setFilterValue(e.target.name, e.target.value);
  }
  function clearAll() {
    setFilters({ department: "", level: "", gender: "", uni: "" });
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
      else toast("Liked! You can send up to 3 free messages.");
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

        <NotifyBanner />

        <div className="fd-mode">
          <button className={scope === "campus" ? "on" : ""} onClick={() => pickScope("campus")}>
            My campus
          </button>
          <button className={scope === "other" ? "on" : ""} onClick={() => pickScope("other")}>
            Other campuses
          </button>
        </div>

        {scope === "other" && (
          <div className="fd-switchrow">
            <div className="fd-switchtext">
              <b>Visible to other campuses</b>
              <span>
                {openToOthers
                  ? "People on other campuses who also have this on can see you."
                  : "You're not visible to other campuses until you switch this back on."}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={openToOthers}
              aria-label="Visible to other campuses"
              className={`fd-switch ${openToOthers ? "on" : ""}`}
              onClick={() => toggleOpen(!openToOthers)}
              disabled={switching}
            ></button>
          </div>
        )}

        {scope === "other" && !openToOthers ? (
          <div className="empty">
            <i className="ti ti-eye-off"></i>
            <h3>You're not visible to other campuses</h3>
            <p>Switch it on above to see people from other universities. They'll be able to see you too.</p>
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
                  {scope === "other" && (
                    <FilterPicker
                      name="uni"
                      value={filters.uni}
                      onChange={setFilterValue}
                      options={uniOptions}
                      placeholder="University"
                      allLabel="All universities"
                      searchLabel="Search universities"
                    />
                  )}
                  <FilterPicker
                    name="department"
                    value={filters.department}
                    onChange={setFilterValue}
                    options={deptItems}
                    placeholder="Department"
                    allLabel="All departments"
                    searchLabel="Search departments"
                  />
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
            ) : scope === "other" && filters.uni && !people.some((p) => p.uni === filters.uni && !blocked.includes(p.id)) ? (
              <div className="empty">
                <i className="ti ti-users"></i>
                <h3>No one from this Campus has joined yet.</h3>
                <p>Try another university, or check back soon.</p>
              </div>
            ) : people.length === 0 ? (
              scope === "other" ? (
                <div className="empty">
                  <i className="ti ti-world"></i>
                  <h3>No one from other campuses yet</h3>
                  <p>People show up here once they switch on Other campuses too. Check back soon.</p>
                </div>
              ) : (
                <div className="empty">
                  <i className="ti ti-users"></i>
                  <h3>You're early</h3>
                  <p>No one else from your campus has joined yet. Invite your friends to Campusly.</p>
                </div>
              )
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
                          <button className="fd-msg" onClick={() => navigate(`/chat/${p.id}`)}>
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