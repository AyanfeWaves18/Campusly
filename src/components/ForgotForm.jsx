import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function ForgotForm() {
  const [by, setBy] = useState("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter the email you signed up with.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setBusy(false);
    if (err) {
      setError(
        err.status === 429
          ? "Too many requests. Please wait a while and try again."
          : "We couldn't send the email. Please try again."
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1>Check your email</h1>
        <div className="au-notice">
          If an account exists for that email, we've sent a link to reset your password. Open it on this
          device.
        </div>
        <p className="au-sub">Can't find it? Check your spam folder.</p>
        <button className="au-btn" onClick={() => setSent(false)}>Use a different email</button>
        <p className="au-switch"><Link to="/login">Back to log in</Link></p>
      </div>
    );
  }

  if (by === "phone") {
    return (
      <div>
        <h1>Forgotten password</h1>
        <p className="au-sub">
          Resetting with a phone number needs text messages, which we're adding later. Please use your
          email for now.
        </p>
        <button className="au-btn" onClick={() => setBy("email")}>Use my email</button>
        <p className="au-switch"><Link to="/login">Back to log in</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1>Forgotten password</h1>
      <p className="au-sub">Enter your email and we'll send you a link to reset your password.</p>

      <label>Email</label>
      <input
        type="email"
        placeholder="name@email.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
      />

      {error && <div className="au-error">{error}</div>}
      <button type="submit" className="au-btn" disabled={busy}>
        {busy ? "Sending..." : "Send reset link"}
      </button>

      <button type="button" className="au-link" onClick={() => setBy("phone")}>
        Use my phone number instead
      </button>
      <p className="au-switch">
        Remembered it? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}