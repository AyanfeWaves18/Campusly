import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { joinGroup, previewGroup } from "../lib/groups.js";
import "./Pages.css";
import "../components/Groups.css";

function JoinBody() {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | missing | error
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewGroup(code).then((res) => {
      if (cancelled) return;
      if (res.error) setStatus("error");
      else if (!res.group) setStatus("missing");
      else {
        setGroup(res.group);
        setStatus("ok");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function join() {
    if (busy) return;
    setBusy(true);
    const res = await joinGroup({ code });
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    navigate(`/group/${res.id}`, { replace: true });
  }

  if (status === "loading") {
    return (
      <div className="pg">
        <div className="row plain">
          <div className="sk" style={{ width: 44, height: 44, borderRadius: "50%" }}></div>
          <div className="row-main"><div className="sk sk-line w60" style={{ margin: 0 }}></div></div>
        </div>
      </div>
    );
  }

  if (status !== "ok") {
    return (
      <div className="pg">
        <div className="empty">
          <i className="ti ti-link-off"></i>
          <h3>{status === "error" ? "Couldn't open this link" : "This link isn't valid anymore"}</h3>
          <p>
            {status === "error"
              ? "Check your internet and try again. You also need a finished profile to join groups."
              : "The group may have been deleted, or its admin made a new link. Ask them for the latest one."}
          </p>
          <Link to="/messages">Back to messages</Link>
        </div>
      </div>
    );
  }

  const full = group.member_count >= group.max_members;
  return (
    <div className="pg">
      <h1>Join this group?</h1>
      <div className="row plain" style={{ alignItems: "flex-start" }}>
        <Avatar name={group.name} bg="#CECBF6" fg="#3C3489" size={52} />
        <div className="row-main">
          <b>
            {group.name}
            {!group.is_public && <i className="ti ti-lock" style={{ marginLeft: 6, fontSize: "0.85em" }}></i>}
          </b>
          {group.description && <span className="gp-desc">{group.description}</span>}
          <span className="gp-meta">
            {group.member_count} of {group.max_members} members · {group.campus_count}{" "}
            {Number(group.campus_count) === 1 ? "campus" : "campuses"}
          </span>
        </div>
      </div>

      <div className="gp-actions" style={{ marginTop: 16 }}>
        {group.is_member ? (
          <button onClick={() => navigate(`/group/${group.id}`, { replace: true })}>Open group</button>
        ) : (
          <button onClick={join} disabled={busy || full}>
            {full ? "Group is full" : busy ? "Joining..." : "Join group"}
          </button>
        )}
        <button className="ghost" onClick={() => navigate("/messages")}>Not now</button>
      </div>
      <p className="gp-hint">Other members can see your name and campus. Be kind, and report anything that isn't okay.</p>
    </div>
  );
}

export default function JoinGroup() {
  return (
    <AppLayout>
      <JoinBody />
    </AppLayout>
  );
}