import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import { BackIcon, SendIcon, SmileIcon } from "../components/Icons.jsx";
import { ReportModal } from "../components/Modals.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { MicIcon, RecorderBar, VoicePlayer, useRecorder } from "../components/VoiceBits.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, isLoggedIn } from "../utils/storage.js";
import { formatWhen } from "../utils/data.js";
import { fetchPerson } from "../lib/people.js";
import { likePerson } from "../lib/likes.js";
import { loadVoiceUrls, sendVoiceNote } from "../lib/voice.js";
import { fetchInvitesWith, respondToInvite, subscribeToInvites } from "../lib/invites.js";
import {
  fetchChatState,
  fetchMessages,
  markRead,
  openTypingChannel,
  sendMessage,
  subscribeToChat,
  subscribeToReads,
} from "../lib/chat.js";
import "./Chat.css";

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

// One tick = sent. Two ticks = seen.
function Ticks({ seen }) {
  return (
    <svg
      className={`ch-ticks ${seen ? "seen" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={seen ? "Seen" : "Sent"}
    >
      {seen ? (
        <>
          <path d="M1.5 12.5l4.5 4.5L15.5 7.5" />
          <path d="M10 16.5l1 1L21.5 7.5" />
        </>
      ) : (
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      )}
    </svg>
  );
}

// An event invite shown inside the chat
function InviteCard({ inv, meId, name, busy, onAnswer }) {
  const iAmInviter = inv.inviterId === meId;
  const past = inv.start && inv.start < Date.now();

  let note = null;
  let buttons = false;
  if (inv.status === "accepted") {
    note = iAmInviter ? `${name} accepted. It's on your profile.` : "You accepted. It's on your profile.";
  } else if (inv.status === "declined") {
    note = iAmInviter ? `${name} can't make it.` : "You said not now.";
  } else if (past) {
    note = "This event has already started.";
  } else if (iAmInviter) {
    note = `Waiting for ${name}...`;
  } else {
    buttons = true;
  }

  return (
    <div className="inv">
      <small className="inv-tag"><i className="ti ti-calendar-event"></i> Event invite</small>
      <h4>{inv.title}</h4>
      <div className="inv-meta">
        {inv.start ? formatWhen(inv.start) : ""}
        {inv.where ? ` · ${inv.where}` : ""}
      </div>
      {buttons ? (
        <div className="inv-actions">
          <button onClick={() => onAnswer(inv.id, true)} disabled={busy}>Accept</button>
          <button className="ghost" onClick={() => onAnswer(inv.id, false)} disabled={busy}>Not now</button>
        </div>
      ) : (
        <div className="inv-note">{note}</div>
      )}
    </div>
  );
}

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const me = getUser();
  const recorder = useRecorder();

  const [person, setPerson] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | missing
  const [chat, setChat] = useState({ state: "closed", remaining: null });
  const [messages, setMessages] = useState([]);
  const [invites, setInvites] = useState({});
  const [busyInvite, setBusyInvite] = useState(false);
  const [voiceUrls, setVoiceUrls] = useState({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [peer, setPeer] = useState(null); // what the other person is doing: "typing" | "recording" | null
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busyLike, setBusyLike] = useState(false);

  const listRef = useRef(null);
  const endRef = useRef(null);
  const typingRef = useRef(null);
  const typingTimer = useRef(null);

  const refreshState = useCallback(async () => {
    const res = await fetchChatState(id);
    if (!res.error) setChat({ state: res.state, remaining: res.remaining });
  }, [id]);

  const loadInvites = useCallback(async () => {
    const res = await fetchInvitesWith(id);
    if (!res.error) setInvites(res.invites);
  }, [id]);

  // Pull down at the top of the messages to refresh
  async function refresh() {
    const [m, s, iv] = await Promise.all([fetchMessages(id), fetchChatState(id), fetchInvitesWith(id)]);
    if (!m.error) setMessages(m.messages);
    if (!s.error) setChat({ state: s.state, remaining: s.remaining });
    if (!iv.error) setInvites(iv.invites);
    markRead(id);
    toast("Chat refreshed");
  }
  const { pull, refreshing } = usePullToRefresh(refresh, listRef);

  // Load the person, the messages, and where the chat stands
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const [p, m, s, iv] = await Promise.all([
        fetchPerson(id),
        fetchMessages(id),
        fetchChatState(id),
        fetchInvitesWith(id),
      ]);
      if (cancelled) return;
      if (p.error) {
        setStatus("missing");
        return;
      }
      setPerson(p.person);
      setMessages(m.messages || []);
      if (!s.error) setChat({ state: s.state, remaining: s.remaining });
      if (!iv.error) setInvites(iv.invites);
      setStatus("ok");
      markRead(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Live updates: new messages, "seen" ticks, invite answers, and the typing / recording signs
  useEffect(() => {
    if (status !== "ok") return;

    const stopMessages = subscribeToChat(id, (m) => {
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      setPeer(null);
      if (m.invite_id) loadInvites();
      if (document.visibilityState === "visible") markRead(id);
      refreshState();
    });
    const stopReads = subscribeToReads(id, (row) => {
      setMessages((list) => list.map((x) => (x.id === row.id ? { ...x, read_at: row.read_at } : x)));
    });
    const stopInvites = subscribeToInvites(() => loadInvites());
    const typingChannel = openTypingChannel(id, (kind) => {
      clearTimeout(typingTimer.current);
      setPeer(kind);
      // If the signal stops coming (closed tab, lost signal), clear it after a moment
      if (kind) typingTimer.current = setTimeout(() => setPeer(null), 3500);
    });
    typingRef.current = typingChannel;

    const onVisible = () => {
      if (document.visibilityState === "visible") markRead(id);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopMessages();
      stopReads();
      stopInvites();
      typingChannel.close();
      typingRef.current = null;
      clearTimeout(typingTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, status, refreshState, loadInvites]);

  // While you record, keep telling the other person. When you stop, tell them that too.
  useEffect(() => {
    if (!recorder.active || recorder.stopped) return;
    typingRef.current?.send("recording");
    const t = setInterval(() => typingRef.current?.send("recording"), 2000);
    return () => {
      clearInterval(t);
      typingRef.current?.send(false);
    };
  }, [recorder.active, recorder.stopped]);

  // Ask for listening links for any voice notes that don't have one yet
  useEffect(() => {
    const paths = messages.map((m) => m.audio_path).filter((p) => p && !voiceUrls[p]);
    if (!paths.length) return;
    let cancelled = false;
    loadVoiceUrls(paths).then((map) => {
      if (!cancelled) setVoiceUrls((v) => ({ ...v, ...map }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, invites, peer, sendingVoice]);

  const canSend = chat.state === "matched" || chat.state === "open";

  async function send(e) {
    e?.preventDefault();
    const t = text.trim();
    if (!t) {
      toast("Type a message first", "err");
      return;
    }
    if (!canSend || sending) return;
    setSending(true);
    const res = await sendMessage(id, t);
    setSending(false);
    if (res.error) {
      toast(res.error, "err");
      refreshState();
      return;
    }
    setMessages((list) => (list.some((x) => x.id === res.message.id) ? list : [...list, res.message]));
    setText("");
    setEmojiOpen(false);
    typingRef.current?.send(false);
    refreshState();
  }

  function onType(e) {
    setText(e.target.value);
    if (canSend && e.target.value) typingRef.current?.send("typing");
  }

  async function startRecording() {
    if (!canSend) return;
    setEmojiOpen(false);
    const res = await recorder.start();
    if (res.error) toast(res.error, "err");
  }

  async function sendRecording() {
    const r = await recorder.finish();
    if (!r) return;
    if (r.blob.size < 800) {
      toast("That voice note was too short.", "err");
      return;
    }
    setSendingVoice(true);
    const res = await sendVoiceNote(id, r.blob, r.seconds, r.mime);
    setSendingVoice(false);
    if (res.error) {
      toast(res.error, "err");
      refreshState();
      return;
    }
    setMessages((list) => (list.some((x) => x.id === res.message.id) ? list : [...list, res.message]));
    refreshState();
  }

  // Accept or decline an event invite
  async function answerInvite(inviteId, accepted) {
    if (busyInvite) return;
    setBusyInvite(true);
    const res = await respondToInvite(inviteId, accepted);
    if (res.error) {
      setBusyInvite(false);
      toast(res.error, "err");
      loadInvites();
      return;
    }
    // Your answer is also posted in the chat, so reload what the chat shows
    const [m, iv] = await Promise.all([fetchMessages(id), fetchInvitesWith(id)]);
    setBusyInvite(false);
    if (!m.error) setMessages(m.messages);
    if (!iv.error) setInvites(iv.invites);
    toast(accepted ? "You're going together! It's on your profile." : "Okay, we let them know.");
  }

  async function like() {
    setBusyLike(true);
    const res = await likePerson(id);
    setBusyLike(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    if (res.match) toast(`It's a match with ${person.name}!`, "match");
    else toast("Liked! You can send up to 3 free messages.");
    refreshState();
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
          This chat isn't available.
          <br />
          <Link to="/messages" style={{ color: "var(--pink)" }}>Back to messages</Link>
        </div>
      </div>
    );
  }

  const [bg, fg] = colorFor(person.id);
  const name = person.name;
  const mine = messages.filter((m) => m.sender_id === me?.id);
  const lastMineId = mine.length ? mine[mine.length - 1].id : null;

  let bar = null;
  if (chat.state === "open") {
    bar = (
      <div className="ch-bar">
        {chat.remaining} free {chat.remaining === 1 ? "message" : "messages"} left. Once you both like
        each other, chat is unlimited.
      </div>
    );
  } else if (chat.state === "limit_wait") {
    bar = <div className="ch-bar lock">{name} needs to like you back before you can keep chatting.</div>;
  } else if (chat.state === "limit_like") {
    bar = (
      <div className="ch-bar lock">
        Like {name} back to keep chatting.
        <button onClick={like} disabled={busyLike}>Like back</button>
      </div>
    );
  } else if (chat.state === "like_first") {
    bar = (
      <div className="ch-bar lock">
        Like {name} before you message them.
        <button onClick={like} disabled={busyLike}>Like {name}</button>
      </div>
    );
  } else if (chat.state === "closed") {
    bar = <div className="ch-bar lock">You can't message this person right now.</div>;
  }

  return (
    <div className="ch">
      <header className="ch-top">
        <button className="ch-back" onClick={() => navigate("/messages")} aria-label="Back to messages">
          <BackIcon size={22} />
        </button>
        <Link to={`/user/${person.id}`} className="ch-who">
          <Avatar photo={person.photoUrls?.[0]} name={name} bg={bg} fg={fg} size={36} />
          <span className="ch-name">
            {name}
            {person.verified && <i className="ti ti-rosette-discount-check vb"></i>}
          </span>
        </Link>
        <button className="ch-report" onClick={() => setMenu(true)}>Block / Report</button>
      </header>

      <PullIndicator pull={pull} refreshing={refreshing} top={64} />

      <main className="ch-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="ch-start">
            <p>
              {chat.state === "matched"
                ? `It's a match. Say hi to ${name}.`
                : `Say hi to ${name}.`}
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === me?.id;
          const inv = m.invite_id ? invites[m.invite_id] : null;
          // The invite itself is a card. The answer ("Accepted: ...") is a normal message.
          const isInviteCard = inv && m.sender_id === inv.inviterId;
          return (
            <div key={m.id} style={{ display: "contents" }}>
              <div className={`ch-msg ${isMine ? "me" : "them"}`}>
                {m.audio_path ? (
                  <VoicePlayer url={voiceUrls[m.audio_path]} seconds={m.audio_seconds} />
                ) : isInviteCard ? (
                  <InviteCard
                    inv={inv}
                    meId={me?.id}
                    name={name}
                    busy={busyInvite}
                    onAnswer={answerInvite}
                  />
                ) : (
                  m.body
                )}
                <span className="ch-meta">
                  {clock(m.created_at)}
                  {isMine && <Ticks seen={!!m.read_at} />}
                </span>
              </div>
              {isMine && m.id === lastMineId && m.read_at && <div className="ch-seen">Seen</div>}
            </div>
          );
        })}

        {sendingVoice && <div className="ch-msg me pending">Sending voice note...</div>}

        {peer && (
          <div
            className="ch-peer"
            aria-label={peer === "recording" ? `${name} is recording a voice note` : `${name} is typing`}
          >
            {peer === "recording" ? (
              <>
                <div className="ch-recording">
                  <span className="ch-mic"><MicIcon size={15} /></span>
                  <span className="ch-bars"><i></i><i></i><i></i><i></i><i></i></span>
                </div>
                <small className="ch-peer-text">{name} is recording a voice note...</small>
              </>
            ) : (
              <div className="ch-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        )}
        <div ref={endRef}></div>
      </main>

      {bar}

      <div className="ch-tools">
        {emojiOpen && canSend && (
          <div className="ch-pop emo-pop">
            <EmojiPicker onPick={(e) => setText((t) => (t + e).slice(0, MAX_TEXT))} />
          </div>
        )}

        {recorder.active ? (
          <RecorderBar
            seconds={recorder.seconds}
            stopped={recorder.stopped}
            onCancel={recorder.cancel}
            onSend={sendRecording}
          />
        ) : (
          <form className={`ch-form ${canSend ? "" : "locked"}`} onSubmit={send}>
            <button
              type="button"
              className="ch-ico"
              aria-label="Emojis"
              disabled={!canSend}
              onClick={() => setEmojiOpen(!emojiOpen)}
            >
              <SmileIcon size={20} />
            </button>
            <input
              placeholder={canSend ? "Type a message" : "Messages locked"}
              value={text}
              maxLength={MAX_TEXT}
              disabled={!canSend}
              onChange={onType}
            />
            {text.trim() || !canSend ? (
              <button
                type="submit"
                className={`ch-send ${text.trim() && canSend ? "" : "off"}`}
                aria-label="Send"
                disabled={sending}
              >
                <SendIcon size={20} />
              </button>
            ) : (
              <button type="button" className="ch-send" aria-label="Record a voice note" onClick={startRecording}>
                <MicIcon size={20} />
              </button>
            )}
          </form>
        )}
      </div>

      {menu && (
        <ReportModal
          profile={{ id: person.id, name }}
          onClose={() => setMenu(false)}
          onDone={(action) => action === "block" && navigate("/messages")}
        />
      )}
    </div>
  );
}