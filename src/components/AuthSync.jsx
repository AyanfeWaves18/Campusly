import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { syncUser } from "../lib/auth.js";
import { getUser, setLoggedIn } from "../utils/storage.js";

export default function AuthSync() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setLoggedIn(false);
        return;
      }
      if (!session) return;

      // Run outside the callback, as Supabase recommends
      setTimeout(async () => {
        const existing = getUser();
        if (existing?.id === session.user.id) {
          setLoggedIn(true);
        } else if (!(await syncUser())) {
          return;
        }
        if (["/login", "/signup", "/verify"].includes(pathRef.current)) {
          navigate("/feed", { replace: true });
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  return null;
}