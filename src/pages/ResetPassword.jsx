import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../lib/supabase.js";
import { syncUser } from "../lib/auth.js";
import { checkPassword, passwordRules } from "../utils/validate.js";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState("checking"); // checking | ready | invalid
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The link in the email signs the person in for a moment, just to let them set a new password
  useEffect(() => {
    let done = false;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !done) {
        done = true;
        setState("ready");
      }
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (done) return;
      done = true;
      setState(s.session ? "ready" : "invalid");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    const pwError = checkPassword(pw);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (pw !== pw2) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) {
      setBusy(false);
      const msg = (err.message || "").toLowerCase();
      setError(
        msg.includes("different") || msg.includes("same")
          ? "Your new password must be different from the old one."
          : "We couldn't change your password. Please try again."
      );
      return;
    }
    await syncUser();
    setBusy(false);
    toast("Password changed");
    navigate("/feed");
  }

  return (
    <div className="au-page">
      <main className="au">
        <Link to="/" className="au-logo"><Logo size={38} /></Link>

        <div className="au-card">
          {state === "checking" && <p className="au-sub">Checking your link...</p>}

          {state === "invalid" && (
            <div>
              <h1>Link expired</h1>
              <p className="au-sub">
                This reset link has expired or was already used. Request a new one.
              </p>
              <Link to="/forgot" className="au-btn" style={{ display: "block", textAlign: "center" }}>
                Request a new link
              </Link>
            </div>
          )}

          {state === "ready" && (
            <form onSubmit={submit}>
              <h1>Set a new password</h1>
              <p className="au-sub">Choose a password you haven't used before.</p>

              <label>New password</label>
              <div className="au-pass">
                <input
                  type={show ? "text" : "password"}
                  maxLength="15"
                  placeholder="8 to 15 characters"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(""); }}
                />
                <button type="button" onClick={() => setShow(!show)} aria-label="Show or hide password">
                  <i className={`ti ${show ? "ti-eye-off" : "ti-eye"}`}></i>
                </button>
              </div>
              <ul className="au-rules">
                {passwordRules(pw).map((r) => (
                  <li key={r.label} className={r.ok && pw ? "ok" : ""}>
                    {r.ok && pw ? "✓" : "○"} {r.label}
                  </li>
                ))}
              </ul>

              <label>Confirm new password</label>
              <input
                type={show ? "text" : "password"}
                maxLength="15"
                placeholder="Type it again"
                value={pw2}
                onChange={(e) => { setPw2(e.target.value); setError(""); }}
              />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn" disabled={busy}>
                {busy ? "Saving..." : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}