import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import { load } from "../utils/storage.js";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { profiles, receivedCompliments } from "../utils/data.js";
import "./Pages.css";

function time(t) {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function Messages() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("chats");
  const chats = load("chats", {});
  const blocked = load("blocked", []);

  const threads = Object.keys(chats)
    .map((id) => {
      const p = profiles.find((x) => String(x.id) === id);
      const msgs = chats[id];
      return p && msgs.length && !blocked.includes(p.id) ? { p, last: msgs[msgs.length - 1] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.last.t - a.last.t);

  return (
    <AppLayout>
      <div className="pg">
        <h1>Messages</h1>
        <p className="pg-sub">Your chats and anonymous compliments.</p>

        <div className="pg-tabs">
          <button className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>Chats</button>
          <button className={tab === "compliments" ? "on" : ""} onClick={() => setTab("compliments")}>Compliments</button>
        </div>

        {tab === "chats" &&
          (threads.length === 0 ? (
            <div className="empty">
              <i className="ti ti-message-off"></i>
              <h3>No messages yet</h3>
              <p>Say hi to someone on the feed, or to one of your matches.</p>
              <Link to="/feed">Go to the feed</Link>
            </div>
          ) : (
            threads.map(({ p, last }) => (
              <div className="row" role="button" tabIndex={0} key={p.id} onClick={() => navigate(`/chat/${p.id}`)}>
                <Link to={`/user/${p.id}`} onClick={(e) => e.stopPropagation()} aria-label={`View ${p.name}'s profile`}>
                  <Avatar name={p.name} bg={p.bg} fg={p.fg} />
                </Link>
                <div className="row-main">
                  <b>{p.name}</b>
                  <span>
                    {last.from === "me" ? "You: " : ""}
                    {last.text || (last.img ? "Photo" : last.file ? last.file.name : "")}
                  </span>
                </div>
                <small>{time(last.t)}</small>
              </div>
            ))
          ))}

        {tab === "compliments" &&
          receivedCompliments.map((c) => (
            <div className="row plain" key={c.id}>
              <Avatar name="?" bg="#CECBF6" fg="#3C3489" />
              <div className="row-main">
                <b>Anonymous</b>
                <span style={{ whiteSpace: "normal" }}>{c.text}</span>
              </div>
              <small>{c.when}</small>
            </div>
          ))}
      </div>
    </AppLayout>
  );
}