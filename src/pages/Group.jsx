import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import GroupInfo from "../components/GroupInfo.jsx";
import { BackIcon, SendIcon } from "../components/Icons.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, isLoggedIn } from "../utils/storage.js";
import {
  fetchGroupInfo,
  fetchGroupMessages,
  markGroupRead,
  sendGroupMessage,
  subscribeToGroup,
} from "../lib/groups.js";
import "./Chat.css";
import "../components/Groups.css";

const MAX_TEXT = 500;
const COLORS = [
  ["#F4C0D1", "#72243E"],
  ["#CECBF6", "#3C3489"],
  ["#F5C4B3", "#712B13"],
  ["#9FE1CB", "#085041"],
  ["#FAC775", "#633806"],
  ["#C0DD97", "#27500A"],
  ["#B5D4F4", "#0C447C"],
];
const colorFor = (id) => COLORS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Group() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const me = getUser();

  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | missing
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const endRef = useRef(null);

  const loadInfo = useCallback(async () => {
    const res = await fetchGroupInfo(id);
    if (!res.error && res.group) setGroup(res.group);
    return res;
  }, [id]);

  // The newest messages. Used first, when someone writes, and as a safety net every 20 seconds.
  const loadMessages = useCallback(async () => {
    const res = await fetchGroupMessages(id);
    if (!res.error) setMessages(res.messages);
    if (document.visibilityState === "visible") markGroupRead(id);
  }, [id]);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const [g, m] = await Promise.all([fetchGroupInfo(id), fetchGroupMessages(id)]);
      if (cancelled) return;
      if (g.error || !g.group) {
        setStatus("missing");
        return;
      }
      setGroup(g.group);
      setMessages(m.messages || []);
      setStatus("ok");
      markGroupRead(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Live: new messages from anyone in the group
  useEffect(() => {
    if (status !== "ok") return;
    const stop = subscribeToGroup(id, () => loadMessages());
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") loadMessages();
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadMessages();
        loadInfo();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, status, loadMessages, loadInfo]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e?.preventDefault();
    const t = text.trim();
    if (!t) {
      toast("Type a message first", "err");
      return;
    }
    if (sending) return;
    setSending(true);
    const res = await sendGroupMessage(id, t);
    setSending(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    const m = res.message;
    setMessages((list) =>
      list.some((x) => x.id === m.id)
        ? list
        : [...list, { id: m.id, sender_id: m.sender_id, sender_name: me?.name, sender_uni: me?.uni, body: m.body, created_at: m.created_at }]
    );
    setText("");
  }

  if (status === "loading") {
    return (
      <div className="ch">
        <div className="ch-empty">Loading...</div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="ch">
        <div className="ch-empty" style={{ textAlign: "center" }}>
          This group isn't available. It may have been deleted, or you're no longer in it.
          <br />
          <Link to="/messages" style={{ color: "var(--pink)" }}>Back to messages</Link>
        </div>
      </div>
    );
  }

  const [bg, fg] = colorFor(group.id);

  return (
    <div className="ch">
      <header className="ch-top">
        <button className="ch-back" onClick={() => navigate("/messages")} aria-label="Back to messages">
          <BackIcon size={22} />
        </button>
        <button className="ch-who ch-who-btn" onClick={() => setShowInfo(true)} aria-label="Group info">
          <Avatar name={group.name} bg={bg} fg={fg} size={36} />
          <span className="ch-name">
            {group.name}
            <span className="gc-sub">
              {group.member_count} {Number(group.member_count) === 1 ? "member" : "members"} · {group.campus_count}{" "}
              {Number(group.campus_count) === 1 ? "campus" : "campuses"}
            </span>
          </span>
        </button>
        <button className="ch-report" onClick={() => setShowInfo(true)}>Info</button>
      </header>

      <main className="ch-list">
        {messages.length === 0 && (
          <div className="ch-start">
            <p>No messages yet. Say hi to the group.</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isMine = m.sender_id === me?.id;
          const prev = messages[i - 1];
          const showName = !isMine && (!prev || prev.sender_id !== m.sender_id);
          return (
            <div className={`ch-msg ${isMine ? "me" : "them"}`} key={m.id}>
              {showName && (
                <span className="gc-from">
                  {m.sender_name || "Unavailable account"}
                  {m.sender_uni && <i> · {m.sender_uni}</i>}
                </span>
              )}
              {m.body}
              <span className="ch-meta">{clock(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={endRef}></div>
      </main>

      <div className="ch-tools">
        <form className="ch-form" onSubmit={send}>
          <input
            placeholder="Message the group"
            value={text}
            maxLength={MAX_TEXT}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className={`ch-send ${text.trim() ? "" : "off"}`}
            aria-label="Send"
            disabled={sending}
          >
            <SendIcon size={20} />
          </button>
        </form>
      </div>

      {showInfo && (
        <GroupInfo
          group={group}
          meId={me?.id}
          onClose={() => setShowInfo(false)}
          onChanged={() => {
            loadInfo();
            loadMessages();
          }}
          onLeft={() => navigate("/messages")}
        />
      )}
    </div>
  );
}