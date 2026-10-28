import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchUnread, subscribeToUnread } from "../lib/chat.js";

const UnreadCtx = createContext({ byPartner: {}, chats: 0, refresh() {} });
export const useUnread = () => useContext(UnreadCtx);

// Keeps the unread numbers up to date for everything inside the app layout
export function UnreadProvider({ children }) {
  const [byPartner, setByPartner] = useState({});
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const res = await fetchUnread();
    if (res.error) return;
    const map = {};
    res.rows.forEach((r) => {
      map[r.partner_id] = r.unread;
    });
    setByPartner(map);
  }, []);

  useEffect(() => {
    refresh();
    // A burst of changes (for example opening a chat) triggers just one refresh
    const stop = subscribeToUnread(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 400);
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // The number on the Messages button counts chats, not messages
  const chats = Object.keys(byPartner).length;

  return <UnreadCtx.Provider value={{ byPartner, chats, refresh }}>{children}</UnreadCtx.Provider>;
}