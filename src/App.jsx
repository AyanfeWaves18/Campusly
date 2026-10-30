import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Auth from "./pages/Auth.jsx";
import Verify from "./pages/Verify.jsx";
import Onboarding from "./pages/Onboarding.jsx";
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  // Changing this number starts the current page fresh, so it loads its data again
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <>
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
    </>
  );
}