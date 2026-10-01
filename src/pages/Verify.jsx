import Logo from "../components/logo.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";
import { getUser, saveUser } from "../utils/storage.js";
import "./Auth.css";
import "./Pages.css";

export default function Verify() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = getUser();
  const [method, setMethod] = useState("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) navigate("/signup");
  }, [user, navigate]);

  if (!user) return null;

  const target =
    method === "email"
      ? user.email.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : "•••• ••• " + user.phone.replace(/\D/g, "").slice(-3);

  function submit(e) {
    e.preventDefault();
    if (code !== "123456") {
      setError("That code isn't right. Try again.");
      return;
    }
    saveUser({ ...user, verified: true });
    toast("Account verified");
    navigate("/feed");
  }

  return (
    <div className="au-page">
      <main className="au">
        <Link to="/" className="au-logo"><Logo size={38} /></Link>

        <div className="au-card">
          <div className="au-tabs">
            <a
              href="#email"
              className={method === "email" ? "on" : ""}
              onClick={(e) => { e.preventDefault(); setMethod("email"); setCode(""); setError(""); }}
            >
              Email
            </a>
            <a
              href="#phone"
              className={method === "phone" ? "on" : ""}
              onClick={(e) => { e.preventDefault(); setMethod("phone"); setCode(""); setError(""); }}
            >
              Phone
            </a>
          </div>

          <form onSubmit={submit}>
            <h1>Verify your account</h1>
            <p className="au-sub">We sent a 6-digit code to {target}.</p>

            <input
              className="vf-code"
              inputMode="numeric"
              maxLength="6"
              placeholder="000000"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
            />

            {error && <div className="au-error">{error}</div>}
            <button type="submit" className="au-btn">Verify</button>

            <div className="vf-links">
              <button type="button" onClick={() => toast("A new code has been sent")}>Resend code</button>
              <button type="button" onClick={() => navigate("/feed")}>Skip for now</button>
            </div>
            <p className="vf-hint">Demo mode: enter 123456</p>
          </form>
        </div>
      </main>
    </div>
  );
}