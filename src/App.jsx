import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Auth from "./pages/Auth.jsx";
import Verify from "./pages/Verify.jsx";
import Feed from "./pages/Feed.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Matches from "./pages/Matches.jsx";
import Messages from "./pages/Messages.jsx";
import Chat from "./pages/chat.jsx";
import Events from "./pages/Events.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Info from "./pages/Info.jsx";
import NotFound from "./pages/NotFound.jsx";
import { CookieNotice } from "./components/Modals.jsx";
import Protect from "./components/Protect.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <Protect />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Auth key="signup" mode="signup" />} />
        <Route path="/login" element={<Auth key="login" mode="login" />} />
        <Route path="/forgot" element={<Auth key="forgot" mode="forgot" />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/events" element={<Events />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/safety" element={<Info />} />
        <Route path="/privacy" element={<Info />} />
        <Route path="/terms" element={<Info />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieNotice />
    </>
  );
}