import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Footer from "./Footer.jsx";
import Logo from "./Logo.jsx";
import { useToast } from "./Toast.jsx";
import { checkReminders } from "../utils/reminders.js";
import { currentTheme, getUser, isLoggedIn, toggleTheme } from "../utils/storage.js";
import { supabase } from "../lib/supabase.js";
import { syncUser } from "../lib/auth.js";
import "./AppLayout.css";

const tabs = [
  { to: "/feed", icon: "ti-flame", label: "Feed" },
  { to: "/events", icon: "ti-calendar-event", label: "Events" },
  { to: "/matches", icon: "ti-heart", label: "Matches" },
  { to: "/messages", icon: "ti-message", label: "Messages" },
  { to: "/profile", icon: "ti-user", label: "Profile" },
];

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [theme, setTheme] = useState(currentTheme());
  const [, setTick] = useState(0);
  const user = getUser();
  const ok = isLoggedIn() && user;
  // A new Google account has no department yet, so it must finish its profile first
  const needsWelcome = !!ok && !user.department;

  // If we aren't logged in yet, ask Supabase first. It may be about to restore a session,
  // for example right after coming back from Google or from the confirmation email.
  useEffect(() => {
    if (ok) return;
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session && (await syncUser())) {
        setTick((t) => t + 1);
      } else {
        navigate("/login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ok, navigate]);

  useEffect(() => {
    if (needsWelcome) navigate("/welcome", { replace: true });
  }, [needsWelcome, navigate]);

  useEffect(() => {
    if (!ok || needsWelcome) return;
    checkReminders(toast);
    const t = setInterval(() => checkReminders(toast), 60000);
    return () => clearInterval(t);
  }, [ok, needsWelcome, toast]);

  if (!ok || needsWelcome) return null;

  return (
    <div className="al">
      <header className="al-top">
        <Link to="/feed" className="al-logo"><Logo /></Link>
        <span className="al-uni">{user.uni}</span>

        <nav className="al-tabs">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "on" : "")}>
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="al-icons">
          <button onClick={() => setTheme(toggleTheme())} aria-label="Switch light or dark mode">
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`}></i>
          </button>
          <Link to="/settings" aria-label="Account settings"><i className="ti ti-settings"></i></Link>
        </div>
      </header>

      <main className="al-main">{children}</main>
      <Footer />

      <nav className="bn">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "on" : "")}>
            <i className={`ti ${t.icon}`}></i>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}