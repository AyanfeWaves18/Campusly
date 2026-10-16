import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../lib/supabase.js";
import { syncUser } from "../lib/auth.js";
import "./Auth.css";

export default function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const email = location.state?.email || "";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  if (!email) return null;

  const masked = email.replace(/(.{2}).+(@.+)/, "$1•••$2");

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/feed` },
    });
    setBusy(false);
    if (error) toast("Please wait a little before asking for another email.", "err");
    else toast("Email sent again. Check your inbox and spam folder.");
  }

  async function check() {
    setBusy(true);
    setMsg("");
    const user = await syncUser();
    setBusy(false);
    if (user) navigate("/feed");
    else setMsg("We can't see your confirmation yet. Open the link in the email first, then tap this again.");
  }

  return (
    <div className="au-page">
      <main className="au">
        <Link to="/" className="au-logo"><Logo size={38} /></Link>

        <div className="au-card">
          <h1>Check your email</h1>
          <p className="au-sub">
            We sent a confirmation link to {masked}. Open it on this device and you'll be signed in
            automatically.
          </p>

          {msg && <div className="au-error">{msg}</div>}

          <button className="au-btn" onClick={check} disabled={busy}>
            {busy ? "Please wait..." : "I've confirmed my email"}
          </button>

          <div className="vf-links">
            <button type="button" onClick={resend} disabled={busy}>Resend email</button>
            <button type="button" onClick={() => navigate("/login")}>Go to log in</button>
          </div>
          <p className="vf-hint">
            Can't find it? Check your spam folder. If you opened the link on another device, just log in
            here.
          </p>
        </div>
      </main>
    </div>
  );
}