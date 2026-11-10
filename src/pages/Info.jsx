import { Link, useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { LAST_UPDATED, PAGES, SUPPORT_EMAIL } from "../utils/legal.js";
import "./Legal.css";

const TABS = [
  ["terms", "Terms"],
  ["privacy", "Privacy"],
  ["safety", "Safety"],
];

export default function Info() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const key = pathname.replace("/", "");
  const page = PAGES[key] || PAGES.terms;
  const current = PAGES[key] ? key : "terms";

  // Goes back to the page you came from. If this page was opened in a new tab, go to the start page.
  function back() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }

  return (
    <div className="lg-page">
      <main className="lg">
        <div className="lg-top">
          <button className="lg-back" onClick={back}>← Back</button>
          <Link to="/" className="lg-logo"><Logo size={30} /></Link>
        </div>

        <nav className="lg-tabs">
          {TABS.map(([k, label]) => (
            <Link key={k} to={`/${k}`} replace className={current === k ? "on" : ""}>
              {label}
            </Link>
          ))}
        </nav>

        <h1>{page.title}</h1>
        <p className="lg-date">Last updated {LAST_UPDATED}</p>
        <p className="lg-intro">{page.intro}</p>

        {page.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p && s.p.map((t, i) => <p key={i}>{t}</p>)}
            {s.list && (
              <ul>
                {s.list.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </section>
        ))}

        <p className="lg-contact">
          Questions? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </main>

      <Footer />
    </div>
  );
}