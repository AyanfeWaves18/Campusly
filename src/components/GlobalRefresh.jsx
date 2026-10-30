import { useLocation } from "react-router-dom";
import { PullIndicator, usePullToRefresh } from "./PullToRefresh.jsx";
import { useToast } from "./Toast.jsx";

// Pages that get pull-to-refresh from here. The Feed and the Chat have their own.
const PAGES = ["/matches", "/messages", "/events", "/profile", "/settings", "/admin", "/user/"];

export default function GlobalRefresh({ onReload }) {
  const { pathname } = useLocation();
  const toast = useToast();
  const enabled = PAGES.some((p) => pathname.startsWith(p));

  async function refresh() {
    // Don't throw away what someone is typing, or a pop-up that is open
    const el = document.activeElement;
    if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
    if (document.querySelector(".md-overlay")) return;

    onReload();
    await new Promise((r) => setTimeout(r, 700));
    toast("Refreshed");
  }

  const { pull, refreshing } = usePullToRefresh(refresh, undefined, enabled);
  if (!enabled) return null;
  return <PullIndicator pull={pull} refreshing={refreshing} top={70} />;
}