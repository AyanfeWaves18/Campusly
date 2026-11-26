import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchUnread, subscribeToUnread } from "../lib/chat.js";
import { fetchMyGroups, subscribeToGroupsActivity } from "../lib/groups.js";
import { fetchLikedMe } from "../lib/likes.js";

const UnreadCtx = createContext({ byPartner: {}, chats: 0, groupUnread: 0, total: 0, likedCount: 0, refresh() {} });
export const useUnread = () => useContext(UnreadCtx);

// Keeps the Messages and Matches numbers up to date for everything inside the app layout
export function UnreadProvider({ children }) {
  const [byPartner, setByPartner] = useState({});
  const [groupUnread, setGroupUnread] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const [u, l, g] = await Promise.all([fetchUnread(), fetchLikedMe(), fetchMyGroups()]);
    if (!u.error) {
      const map = {};
      u.rows.forEach((r) => {
        map[r.partner_id] = r.unread;
      });
      setByPartner(map);
    }
    if (!l.error) setLikedCount(l.rows.length);
    if (!g.error) setGroupUnread(g.groups.reduce((n, x) => n + Number(x.unread || 0), 0));
  }, []);

  useEffect(() => {
    refresh();
    // Messages arrive live. A burst of changes triggers just one refresh.
    const later = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 400);
    };
    const stopChats = subscribeToUnread(later);
    const stopGroups = subscribeToGroupsActivity(later);
    // Likes are private and not delivered live, so check again now and then
    const poll = setInterval(refresh, 45000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopChats();
      stopGroups();
      clearInterval(poll);
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Chats with something unread
  const chats = Object.keys(byPartner).length;
  // Every unread message: personal chats plus groups. This is the number on the Messages icon.
  const total = Object.values(byPartner).reduce((n, x) => n + Number(x || 0), 0) + groupUnread;

  return (
    <UnreadCtx.Provider value={{ byPartner, chats, groupUnread, total, likedCount, refresh }}>
      {children}
    </UnreadCtx.Provider>
  );
}