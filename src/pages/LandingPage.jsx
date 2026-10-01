import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/logo.jsx";
import { ChevronIcon } from "../components/Icons.jsx";
import { save } from "../utils/storage.js";
import "./LandingPage.css";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";

const universities = [{ name: "Crawford University" }];

const steps = [
  { icon: "ti-school", color: "#7F77DD", title: "1. Pick your campus", text: "Choose your university and join in a minute." },
  { icon: "ti-user-circle", color: "#D85A30", title: "2. Build your profile", text: "Department, level, interests." },
  { icon: "ti-heart", color: "#D4537E", title: "3. Match and talk", text: "Scroll, match, chat." },
];

const features = [
  { icon: "ti-lock", color: "#7F77DD", title: "Campus only" },
  { icon: "ti-eye-off", color: "#D85A30", title: "Hide from people" },
  { icon: "ti-calendar-event", color: "#D4537E", title: "Campus events" },
  { icon: "ti-users", color: "#1D9E75", title: "Dates or friends" },
];

export default function LandingPage() {
  const [uni, setUni] = useState("");
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Both "Get started" and "Log in" go through here
  function goTo(target) {
    if (!uni) {
      setMissing(true);
      setOpen(true);
      document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    save("uni", uni);
    navigate(target, { state: { uni } });
  }

  return (
    <div className="lp">
      <header className="lp-hero">
        <nav className="lp-nav">
          <Logo size={34} />
          <button className="lp-pill" onClick={() => goTo("/login")}>Log in</button>
        </nav>

        <div className="lp-hero-body">
          <h1>
            Meet someone
            <span>on your campus.</span>
          </h1>
          <p>Verified students only. Real people, real vibes, a few minutes from you.</p>

          <div className="lp-picker" id="join">
            <div className="lp-dd" ref={ref}>
              <button
                type="button"
                className={`lp-dd-btn ${uni ? "" : "ph"}`}
                onClick={() => setOpen(!open)}
                aria-expanded={open}
              >
                <span>{uni || "Choose your university"}</span>
                <span className={`lp-chevron ${open ? "up" : ""}`}>
                  <ChevronIcon size={22} />
                </span>
              </button>

              {open && (
                <div className="lp-menu">
                  {universities.map((u) => (
                    <button
                      type="button"
                      key={u.name}
                      className="lp-menu-item"
                      onClick={() => {
                        setUni(u.name);
                        setMissing(false);
                        setOpen(false);
                      }}
                    >
                      {u.name}
                      {uni === u.name && " ✓"}
                    </button>
                  ))}
                  <div className="lp-menu-note">More universities coming soon</div>
                </div>
              )}
            </div>

            <button className="lp-go" onClick={() => goTo("/signup")}>Get started</button>
          </div>
          <small className={missing ? "err" : ""}>
            {missing ? "Please choose your university first." : "Free to join. Takes under a minute."}
          </small>
        </div>
      </header>

      <section className="lp-how">
        <div className="lp-inner">
          <h2>How it works</h2>
          <div className="lp-grid three">
            {steps.map((s) => (
              <div className="lp-step" key={s.title}>
                <i className={`ti ${s.icon}`} style={{ color: s.color }} aria-hidden="true"></i>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>

          <h2 className="lp-gap">Made for campus life</h2>
          <div className="lp-grid four">
            {features.map((f) => (
              <div className="lp-feature" key={f.title}>
                <i className={`ti ${f.icon}`} style={{ color: f.color }} aria-hidden="true"></i>
                <h3>{f.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <h2>Your next favourite person might be in the same lecture hall.</h2>
        <a href="#join" className="lp-cta-btn">Pick your university</a>
      </section>

      <Footer />
    </div>
  );
}