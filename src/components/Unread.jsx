import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchUnread, subscribeToUnread } from "../lib/chat.js";
import { fetchLikedMe } from "../lib/likes.js";

const UnreadCtx = createContext({ byPartner: {}, chats: 0, likedCount: 0, refresh() {} });
export const useUnread = () => useContext(UnreadCtx);

// Keeps the Messages and Matches numbers up to date for everything inside the app layout
export function UnreadProvider({ children }) {
  const [byPartner, setByPartner] = useState({});
  const [likedCount, setLikedCount] = useState(0);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const [u, l] = await Promise.all([fetchUnread(), fetchLikedMe()]);
    if (!u.error) {
      const map = {};
      u.rows.forEach((r) => {
        map[r.partner_id] = r.unread;
      });
      setByPartner(map);
    }
    if (!l.error) setLikedCount(l.rows.length);
  }, []);

  useEffect(() => {
    refresh();
    // Messages arrive live. A burst of changes triggers just one refresh.
    const stop = subscribeToUnread(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 400);
    });
    // Likes are private and not delivered live, so check again now and then
    const poll = setInterval(refresh, 45000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      clearInterval(poll);
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // The Messages number counts chats, not messages
  const chats = Object.keys(byPartner).length;

  return (
    <UnreadCtx.Provider value={{ byPartner, chats, likedCount, refresh }}>{children}</UnreadCtx.Provider>
  );
}