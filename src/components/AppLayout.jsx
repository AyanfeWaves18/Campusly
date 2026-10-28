import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Footer from "./Footer.jsx";
import Logo from "./Logo.jsx";
import { useToast } from "./Toast.jsx";
import { UnreadProvider, useUnread } from "./Unread.jsx";
import { checkReminders } from "../utils/reminders.js";
import { currentTheme, getUser, isLoggedIn, toggleTheme } from "../utils/storage.js";
import { supabase } from "../lib/supabase.js";
import { syncUser } from "../lib/auth.js";
import { fetchMyGoingEvents } from "../lib/events.js";
import "./AppLayout.css";

const tabs = [
  { to: "/feed", icon: "ti-flame", label: "Feed" },
  { to: "/events", icon: "ti-calendar-event", label: "Events" },
  { to: "/matches", icon: "ti-heart", label: "Matches" },
  { to: "/messages", icon: "ti-message", label: "Messages", badge: true },
  { to: "/profile", icon: "ti-user", label: "Profile" },
];

// The number of chats with something you haven't read yet
function MessagesBadge() {
  const { chats } = useUnread();
  if (!chats) return null;
  return (
    <span className="tab-badge" aria-label={`${chats} unread chats`}>
      {chats > 9 ? "9+" : chats}
    </span>
  );
}

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

  // Day-before reminders for the events you are going to
  useEffect(() => {
    if (!ok || needsWelcome) return;
    let list = [];
    let stopped = false;

    const refresh = async () => {
      const res = await fetchMyGoingEvents();
      if (stopped) return;
      if (!res.error) list = res.events;
      checkReminders(toast, list);
    };

    refresh();
    const tick = setInterval(() => checkReminders(toast, list), 60000);
    const reload = setInterval(refresh, 10 * 60000);
    return () => {
      stopped = true;
      clearInterval(tick);
      clearInterval(reload);
    };
  }, [ok, needsWelcome, toast]);

  if (!ok || needsWelcome) return null;

  return (
    <UnreadProvider>
      <div className="al">
        <header className="al-top">
          <Link to="/feed" className="al-logo"><Logo /></Link>
          <span className="al-uni">{user.uni}</span>

          <nav className="al-tabs">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "on" : "")}>
                {t.label}
                {t.badge && <MessagesBadge />}
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
              {t.badge && <MessagesBadge />}
            </NavLink>
          ))}
        </nav>
      </div>
    </UnreadProvider>
  );
}