import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import LandingPage from "./pages/LandingPage.jsx";
import Auth from "./pages/Auth.jsx";
import Verify from "./pages/Verify.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import AgeGate from "./pages/AgeGate.jsx";
import Suspended from "./pages/Suspended.jsx";
import Feed from "./pages/Feed.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Matches from "./pages/Matches.jsx";
import Messages from "./pages/Messages.jsx";
import Chat from "./pages/Chat.jsx";
import Events from "./pages/Events.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Admin from "./pages/Admin.jsx";
import Info from "./pages/Info.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import NotFound from "./pages/NotFound.jsx";
import { CookieNotice } from "./components/Modals.jsx";
import Protect from "./components/Protect.jsx";
import AuthSync from "./components/AuthSync.jsx";
import GlobalRefresh from "./components/GlobalRefresh.jsx";
import InstallBanner from "./components/InstallApp.jsx";
import { SUPPORT_EMAIL } from "./utils/legal.js";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Shown instead of a blank page if something unexpected breaks
function CrashScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 380 }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.5, marginBottom: 18 }}>
          We've been told about it. Please reload the page. If it keeps happening, write to {SUPPORT_EMAIL}.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "var(--pink)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "10px 24px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Changing this number starts the current page fresh, so it loads its data again
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <Protect />
      <AuthSync />
      <ScrollToTop />
      <GlobalRefresh onReload={() => setReloadKey((k) => k + 1)} />
      <Routes key={reloadKey}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Auth key="signup" mode="signup" />} />
        <Route path="/login" element={<Auth key="login" mode="login" />} />
        <Route path="/forgot" element={<Auth key="forgot" mode="forgot" />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/confirm" element={<AgeGate />} />
        <Route path="/suspended" element={<Suspended />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/events" element={<Events />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/safety" element={<Info />} />
        <Route path="/privacy" element={<Info />} />
        <Route path="/terms" element={<Info />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieNotice />
      <InstallBanner />
    </Sentry.ErrorBoundary>
  );
}