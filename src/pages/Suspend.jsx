import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { SUPPORT_EMAIL } from "../utils/legal.js";
import "./Auth.css";

export default function Suspended() {
  return (
    <div className="au-page">
      <main className="au">
        <div className="au-logo"><Logo size={38} /></div>
        <div className="au-card">
          <h1>Your account is suspended</h1>
          <p className="au-sub">
            Your account has been suspended because of a report or a problem with how it was used. If you
            think this is a mistake, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and
            we'll take a look.
          </p>
          <p className="au-switch"><Link to="/">Back to the start page</Link></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}